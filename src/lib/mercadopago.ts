/**
 * HÓSPEDE CLUB — Módulo de Integração Oficial com o Mercado Pago
 * Suporta:
 * 1. PIX Transparente (Geração de QR Code Copia e Cola + Imagem Base64)
 * 2. Cartão de Crédito em até 12x
 * 3. Fallback inteligente em modo de testes / simulação caso a chave ainda não tenha sido inserida no .env
 */

export interface MercadoPagoPaymentInput {
  amount: number;
  description: string;
  paymentMethod: "pix" | "card";
  installments?: number;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
    phone?: string;
  };
  cardToken?: string;
  cardIssuerId?: string;
  paymentMethodId?: string; // visa, master, elo, amex
}

export interface MercadoPagoPaymentResult {
  ok: boolean;
  paymentId: string;
  status: "pending" | "approved" | "in_process" | "rejected";
  paymentMethod: "pix" | "card";
  pix?: {
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl?: string;
    expiresAt?: string;
  };
  card?: {
    installments: number;
    installmentAmount: number;
    totalAmount: number;
    authorizationCode?: string;
  };
  isSimulation: boolean;
  message?: string;
}

export async function processMercadoPagoPayment(
  input: MercadoPagoPaymentInput
): Promise<MercadoPagoPaymentResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || "";

  // Se não houver token configurado, executa em Modo Sandbox / Simulação Realista
  if (!accessToken) {
    const fakeId = `MP-SIM-${Date.now()}`;
    if (input.paymentMethod === "pix") {
      const mockPixKey = `00020126580014br.gov.bcb.pix0136hospedeclub-${Math.random().toString(36).substring(2, 10)}520400005303986540${input.amount.toFixed(2)}5802BR5916HOSPEDE CLUB ME6009SAO PAULO62070503***6304`;
      // Mini SVG de QR Code codificado em Base64 para exibição imediata
      const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="25" height="25" fill="#0F5257"/><rect x="65" y="10" width="25" height="25" fill="#0F5257"/><rect x="10" y="65" width="25" height="25" fill="#0F5257"/><rect x="42" y="42" width="16" height="16" fill="#B8863B"/><rect x="45" y="15" width="10" height="10" fill="#182026"/><rect x="15" y="45" width="10" height="10" fill="#182026"/><rect x="75" y="45" width="10" height="10" fill="#182026"/><rect x="45" y="75" width="10" height="10" fill="#182026"/></svg>`;
      const sampleBase64 = Buffer.from(sampleSvg).toString("base64");

      return {
        ok: true,
        paymentId: fakeId,
        status: "pending",
        paymentMethod: "pix",
        isSimulation: true,
        message:
          "Modo Simulação (Para gerar QR Code real do Banco Central, adicione MERCADOPAGO_ACCESS_TOKEN no .env.local)",
        pix: {
          qrCode: mockPixKey,
          qrCodeBase64: sampleBase64,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };
    } else {
      const inst = Math.max(1, input.installments || 1);
      return {
        ok: true,
        paymentId: fakeId,
        status: "approved",
        paymentMethod: "card",
        isSimulation: true,
        message: "Pagamento com Cartão aprovado em Modo Simulação.",
        card: {
          installments: inst,
          installmentAmount: Number((input.amount / inst).toFixed(2)),
          totalAmount: input.amount,
          authorizationCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      };
    }
  }

  // Chamada oficial à API REST do Mercado Pago v1/payments
  try {
    const cleanCpf = input.payer.cpf.replace(/\D/g, "");
    const idempotencyKey = `hospede-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (input.paymentMethod === "pix") {
      const payload = {
        transaction_amount: Number(input.amount.toFixed(2)),
        description: input.description,
        payment_method_id: "pix",
        payer: {
          email: input.payer.email,
          first_name: input.payer.firstName,
          last_name: input.payer.lastName,
          identification: {
            type: "CPF",
            number: cleanCpf || "11111111111",
          },
        },
      };

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.cause?.[0]?.description ||
            `Erro na API Mercado Pago (${res.status})`
        );
      }

      const txData = data.point_of_interaction?.transaction_data;
      return {
        ok: true,
        paymentId: String(data.id),
        status: data.status || "pending",
        paymentMethod: "pix",
        isSimulation: false,
        pix: {
          qrCode: txData?.qr_code || "",
          qrCodeBase64: txData?.qr_code_base64 || "",
          ticketUrl: txData?.ticket_url,
          expiresAt: data.date_of_expiration,
        },
      };
    } else {
      // Cartão de Crédito
      const inst = Math.max(1, input.installments || 1);
      const payload: Record<string, unknown> = {
        transaction_amount: Number(input.amount.toFixed(2)),
        description: input.description,
        installments: inst,
        payment_method_id: input.paymentMethodId || "visa",
        payer: {
          email: input.payer.email,
          first_name: input.payer.firstName,
          last_name: input.payer.lastName,
          identification: {
            type: "CPF",
            number: cleanCpf || "11111111111",
          },
        },
      };

      if (input.cardToken) {
        payload.token = input.cardToken;
      }
      if (input.cardIssuerId) {
        payload.issuer_id = input.cardIssuerId;
      }

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.cause?.[0]?.description ||
            `Erro na API Mercado Pago (${res.status})`
        );
      }

      return {
        ok: true,
        paymentId: String(data.id),
        status: data.status === "approved" ? "approved" : "in_process",
        paymentMethod: "card",
        isSimulation: false,
        card: {
          installments: inst,
          installmentAmount: Number((input.amount / inst).toFixed(2)),
          totalAmount: input.amount,
          authorizationCode: data.authorization_code || String(data.id),
        },
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha ao conectar com Mercado Pago";
    return {
      ok: false,
      paymentId: "",
      status: "rejected",
      paymentMethod: input.paymentMethod,
      isSimulation: false,
      message: msg,
    };
  }
}

