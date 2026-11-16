import { execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execFile);

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
 * O código é enviado apenas pelo gateway configurado ou pelo binário local.
 */
export async function sendWhatsAppVerificationCode(params: {
  phone: string;
  code: string;
  customerName: string;
}): Promise<WacliSendResult> {
  const cleanPhone = sanitizeWhatsAppNumber(params.phone);
  const firstName = params.customerName.trim().split(" ")[0] || "Cliente";

  const messageText =
    `🌟 Hóspede Club | Ativação VIP\n\n` +
    `Olá, ${firstName}! 👋\n\n` +
    `Seu cadastro no Hóspede Club foi realizado com sucesso!\n\n` +
    `Para ativar sua conta e aproveitar todos os benefícios exclusivos, siga as instruções abaixo:\n\n` +
    `🔑 Seu código de ativação: *${params.code}*\n\n` +
    `📲 Envie OK e informe o código acima no site para concluir a ativação.\n\n` +
    `⏳ Atenção: o código é válido por apenas 15 minutos.\n\n` +
    `_Seja bem-vindo(a) ao Hóspede Club!_ 💙`;


  // Endpoints prioritários para chamada HTTP do WACLI Gateway
  const candidateEndpoints = [process.env.WACLI_ENDPOINT || "http://hospede-wacli:3001/send"];

  const wacliApiKey = process.env.WACLI_API_KEY || process.env.WACLI_TOKEN;

  let lastError = "";
  let isSelfNumber = false;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
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
        return {
          success: true,
          messageId: data.id || data.messageId || `WACLI-${Date.now()}`,
          mockMode: false,
        };
      }

      // Analisa o motivo da falha retornado pelo WhatsApp / wacli
      const errorMsg = data.error || responseText;
      console.warn("[WACLI] O gateway recusou o envio.", response.status);
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
      mockMode: true,
    };
  }

  // 2. Tenta envio via comando de terminal wacli local (se binário estiver instalado no PATH do servidor)
  try {
    const wacliBin = process.env.WACLI_BIN_PATH || "wacli";
    await execAsync(wacliBin, ["send", "--to", cleanPhone, "--message", messageText], { timeout: 8000 });
    return {
      success: true,
      messageId: `CLI-${Date.now()}`,
      mockMode: false,
    };
  } catch (cliErr: any) {
    console.warn("[WACLI] Envio indisponível.");
    return {
      success: false,
      error: lastError,
      mockMode: true,
    };
  }
}

