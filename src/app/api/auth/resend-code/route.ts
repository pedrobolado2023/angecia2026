import { NextRequest, NextResponse } from "next/server";
import { resendCustomerWhatsAppCode } from "@/lib/customerStore";
import { sendWhatsAppVerificationCode } from "@/lib/wacliService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier = "" } = body;

    if (!identifier.trim()) {
      return NextResponse.json(
        { ok: false, error: "Informe o e-mail, CPF ou WhatsApp do cadastro." },
        { status: 400 }
      );
    }

    const { customer, newCode } = resendCustomerWhatsAppCode(identifier);

    const wacliResult = await sendWhatsAppVerificationCode({
      phone: customer.whatsapp,
      code: newCode,
      customerName: customer.fullName,
    });

    const isSelf = Boolean(wacliResult.selfNumberError);

    return NextResponse.json({
      ok: true,
      message: isSelf
        ? `Atenção: O número informado (${customer.whatsapp}) é o próprio número de envio do WhatsApp da agência (+55 62 99347-3656). O WhatsApp não permite o envio para o próprio número. Use o código exibido abaixo para validar seu acesso de teste.`
        : `Novo código de 6 dígitos enviado para o WhatsApp ${customer.whatsapp}.`,
      selfNumberError: isSelf,
      previewCode: wacliResult.mockMode ? newCode : undefined,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao reenviar código.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}

