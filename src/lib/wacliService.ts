import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WacliSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mockMode?: boolean;
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
    `Para ativar seus *7 dias de acesso exclusivo de Membro* (com tarifas até 28% OFF), informe o código abaixo:\n\n` +
    `🔑 *CÓDIGO: ${params.code}*\n\n` +
    `_Este código expira em 15 minutos. Boas viagens!_`;

  console.log(`[HÓSPEDE CLUB • WACLI DISPATCH] Disparando para ${cleanPhone}: Código ${params.code}`);

  // 1. Tenta envio via API HTTP da wacli (se configurada via variável de ambiente)
  const wacliEndpoint = process.env.WACLI_ENDPOINT;
  const wacliApiKey = process.env.WACLI_API_KEY || process.env.WACLI_TOKEN;

  if (wacliEndpoint) {
    try {
      const response = await fetch(wacliEndpoint, {
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

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          messageId: data.id || data.messageId || `WACLI-${Date.now()}`,
          mockMode: false,
        };
      }
    } catch (httpErr) {
      console.warn("[WACLI HTTP Warning] Falha na rota HTTP da wacli, tentando fallback CLI:", httpErr);
    }
  }

  // 2. Tenta envio via comando de terminal wacli (se binário estiver instalado no PATH do servidor)
  try {
    const wacliBin = process.env.WACLI_BIN_PATH || "wacli";
    // Executa comando wacli send se disponível
    const { stdout } = await execAsync(
      `"${wacliBin}" send --to "${cleanPhone}" --message "${messageText.replace(/"/g, '\\"')}"`,
      { timeout: 8000 }
    );
    return {
      success: true,
      messageId: `CLI-${Date.now()}`,
      mockMode: false,
    };
  } catch {
    // 3. Fallback Gracioso / Mock Mode Ativo enquanto a wacli não está pareada
    console.log(
      `[WACLI MOCK ATIVO] Código de verificação para ${params.customerName} (${cleanPhone}): ${params.code}`
    );
    return {
      success: true,
      messageId: `MOCK-${Date.now()}`,
      mockMode: true,
    };
  }
}
