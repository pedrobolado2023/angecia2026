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

    return NextResponse.json({
      ok: true,
      message: `Novo código de 6 dígitos enviado para o WhatsApp ${customer.whatsapp}.`,
      previewCode: wacliResult.mockMode ? newCode : undefined,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao reenviar código.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}
