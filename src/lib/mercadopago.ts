/**
 * HÓSPEDE CLUB — Módulo de Integração Oficial com o Mercado Pago
 * Suporta:
 * 1. PIX Transparente (Geração de QR Code Real via qrcode + Mercado Pago API)
 * 2. Cartão de Crédito em até 12x
 * 3. Geração robusta de QR Code em formato PNG DataURL
 */

import QRCode from "qrcode";

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
  const accessToken =
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
    process.env.MP_ACCESS_TOKEN?.trim() ||
    "";

  // Se não houver token configurado no ambiente, executa em Modo Sandbox / Simulação
  if (!accessToken) {
    const fakeId = `MP-SIM-${Date.now()}`;
    if (input.paymentMethod === "pix") {
      const mockPixKey = `00020126580014br.gov.bcb.pix0136hospedeclub-${Math.random()
        .toString(36)
        .substring(2, 10)}520400005303986540${input.amount.toFixed(
        2
      )}5802BR5916HOSPEDE CLUB ME6009SAO PAULO62070503***6304`;

      // Gera QR Code PNG real e escaneável a partir da chave PIX
      const qrDataUrl = await QRCode.toDataURL(mockPixKey, {
        margin: 1,
        width: 260,
        color: {
          dark: "#0F5257",
          light: "#FFFFFF",
        },
      });

      return {
        ok: true,
        paymentId: fakeId,
        status: "pending",
        paymentMethod: "pix",
        isSimulation: true,
        message:
          "Modo Simulação Ativo (Para gerar cobranças reais do Banco Central, adicione MERCADOPAGO_ACCESS_TOKEN no app do Frontend no Easypanel)",
        pix: {
          qrCode: mockPixKey,
          qrCodeBase64: qrDataUrl,
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
    const idempotencyKey = `hospede-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

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
      const rawQrText = txData?.qr_code || "";

      // Se o Mercado Pago não fornecer o base64 diretamente, geramos o PNG usando QRCode
      let finalQrBase64 = txData?.qr_code_base64 || "";
      if (!finalQrBase64 && rawQrText) {
        finalQrBase64 = await QRCode.toDataURL(rawQrText, {
          margin: 1,
          width: 260,
        });
      }

      return {
        ok: true,
        paymentId: String(data.id),
        status: data.status || "pending",
        paymentMethod: "pix",
        isSimulation: false,
        pix: {
          qrCode: rawQrText,
          qrCodeBase64: finalQrBase64,
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
    const msg =
      err instanceof Error ? err.message : "Falha ao conectar com Mercado Pago";
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
