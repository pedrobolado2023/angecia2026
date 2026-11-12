import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WacliSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mockMode?: boolean;
  selfNumberError?: boolean;
}

/**
 * Limpa e padroniza número de telefone para formato DDI + DDD + Número (ex: 5511999999999)
 */
export function sanitizeWhatsAppNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Dispara mensagem oficial com o código de 6 dígitos via wacli (CLI ou endpoint HTTP).
 * Se o wacli ainda não tiver o token ou credenciais configuradas no ambiente,
 * opera de forma resiliente registrando em log e retornando sucesso (mock funcional).
 */
export async function sendWhatsAppVerificationCode(params: {
  phone: string;
  code: string;
  customerName: string;
}): Promise<WacliSendResult> {
  const cleanPhone = sanitizeWhatsAppNumber(params.phone);
  const firstName = params.customerName.trim().split(" ")[0] || "Cliente";

  const messageText =
    `🌟 *Hóspede Club • Código de Ativação VIP*\n\n` +
    `Olá, *${firstName}*! Seu cadastro no Hóspede Club foi realizado com sucesso.\n\n` +
    `Mandar um *OK* e colocar código informado abaixo no site:\n\n` +
    `🔑 *CÓDIGO: ${params.code}*\n\n` +
    `_Este código expira em 15 minutos. Boas viagens!_`;

  console.log(`[HÓSPEDE CLUB • WACLI DISPATCH] Disparando para ${cleanPhone}: Código ${params.code}`);

  // Endpoints prioritários para chamada HTTP do WACLI Gateway
  const candidateEndpoints = [
    process.env.WACLI_ENDPOINT,
    "http://hospede-wacli:3001/send",
    "https://agentesia-hospede-wacli.4nvzqw.easypanel.host/send",
  ].filter(Boolean) as string[];

  const wacliApiKey = process.env.WACLI_API_KEY || process.env.WACLI_TOKEN;

  let lastError = "";
  let isSelfNumber = false;

  for (const endpoint of candidateEndpoints) {
    try {
      console.log(`[WACLI DISPATCH] Tentando endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(wacliApiKey ? { Authorization: `Bearer ${wacliApiKey}` } : {}),
        },
        body: JSON.stringify({
          to: cleanPhone,
          message: messageText,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (response.ok && data.success !== false) {
        console.log(`[WACLI DISPATCH SUCESSO] Mensagem enviada com sucesso para ${cleanPhone} via ${endpoint}!`);
        return {
          success: true,
          messageId: data.id || data.messageId || `WACLI-${Date.now()}`,
          mockMode: false,
        };
      }

      // Analisa o motivo da falha retornado pelo WhatsApp / wacli
      const errorMsg = data.error || responseText;
      console.warn(`[WACLI DISPATCH ERRO] ${endpoint} retornou status ${response.status}:`, errorMsg);
      lastError = errorMsg;

      if (errorMsg.includes("linked account itself") || errorMsg.includes("self-messages")) {
        isSelfNumber = true;
        // Não adianta tentar outros endpoints se o erro é do próprio WhatsApp que proíbe envio para o próprio número conectado
        break;
      }
    } catch (httpErr: any) {
      console.warn(`[WACLI HTTP Warning] Falha ao tentar ${endpoint}:`, httpErr.message);
      lastError = httpErr.message;
    }
  }

  if (isSelfNumber) {
    return {
      success: false,
      error: "O número cadastrado é o mesmo número conectado ao WhatsApp do sistema (+55 62 99347-3656). O WhatsApp não permite enviar mensagem para o próprio aparelho conectado. Cadastre um número de celular diferente para receber a mensagem.",
      selfNumberError: true,
      mockMode: true, // Libera o previewCode para o administrador conseguir logar mesmo testando com o próprio número
    };
  }

  // 2. Tenta envio via comando de terminal wacli local (se binário estiver instalado no PATH do servidor)
  try {
    const wacliBin = process.env.WACLI_BIN_PATH || "wacli";
    const { stdout } = await execAsync(
      `"${wacliBin}" send --to "${cleanPhone}" --message "${messageText.replace(/"/g, '\\"')}"`,
      { timeout: 8000 }
    );
    return {
      success: true,
      messageId: `CLI-${Date.now()}`,
      mockMode: false,
    };
  } catch (cliErr: any) {
    // 3. Fallback Gracioso / Mock Mode Ativo apenas se o WACLI falhar
    console.log(
      `[WACLI MOCK ATIVO] Falha no WACLI (${lastError || cliErr.message}). Código para ${params.customerName} (${cleanPhone}): ${params.code}`
    );
    return {
      success: true,
      messageId: `MOCK-${Date.now()}`,
      error: lastError,
      mockMode: true,
    };
  }
}

