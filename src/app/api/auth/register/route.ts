import { NextRequest, NextResponse } from "next/server";
import { registerCustomerProfile, CustomerAddress } from "@/lib/customerStore";
import { sendWhatsAppVerificationCode } from "@/lib/wacliService";
import { saveCustomerToPostgres } from "@/lib/postgres";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName = "",
      whatsapp = "",
      cpf = "",
      email = "",
      password = "",
      address,
    } = body;

    // Validação dos campos obrigatórios
    if (!fullName.trim()) {
      return NextResponse.json(
        { ok: false, error: "Informe seu Nome Completo." },
        { status: 400 }
      );
    }

    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { ok: false, error: "Informe um telefone WhatsApp válido com DDD." },
        { status: 400 }
      );
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      return NextResponse.json(
        { ok: false, error: "Informe um CPF válido com 11 dígitos." },
        { status: 400 }
      );
    }

    if (!email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    if (!address || !address.cep || !address.street || !address.city || !address.state) {
      return NextResponse.json(
        {
          ok: false,
          error: "Endereço incompleto. Preencha CEP, Rua, Bairro, Cidade e Estado.",
        },
        { status: 400 }
      );
    }

    const customerAddress: CustomerAddress = {
      cep: String(address.cep).trim(),
      street: String(address.street).trim(),
      number: String(address.number || "S/N").trim(),
      complement: address.complement ? String(address.complement).trim() : undefined,
      neighborhood: String(address.neighborhood || "").trim(),
      city: String(address.city).trim(),
      state: String(address.state).trim().toUpperCase(),
    };

    // Registra o perfil e gera o código de 6 dígitos
    const { customer, verificationCode } = registerCustomerProfile({
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      cpf: cpf.trim(),
      email: email.trim(),
      password: password ? String(password).trim() : undefined,
      address: customerAddress,
    });

    // Persiste imediatamente no banco de dados PostgreSQL
    try {
      await saveCustomerToPostgres(customer, verificationCode);
    } catch (pgErr) {
      console.warn("[Register Route] Aviso: Falha ao persistir no PostgreSQL (contingência CRM JSON mantida):", pgErr);
    }

    // Dispara via WACLI (WhatsApp)
    const wacliResult = await sendWhatsAppVerificationCode({
      phone: customer.whatsapp,
      code: verificationCode,
      customerName: customer.fullName,
    });

    const isSelf = Boolean(wacliResult.selfNumberError);

    return NextResponse.json({
      ok: true,
      message: isSelf
        ? `Atenção: O número informado (${customer.whatsapp}) é o próprio número de envio do WhatsApp da agência (+55 62 99347-3656). O WhatsApp não permite o envio para o próprio número. Use o código exibido abaixo para validar seu acesso de teste.`
        : `Cadastro realizado com sucesso! Enviamos um código de segurança de 6 dígitos para o seu WhatsApp (${customer.whatsapp}).`,
      customerId: customer.id,
      email: customer.email,
      whatsapp: customer.whatsapp,
      selfNumberError: isSelf,
      // Se for o próprio número ou mock, exibe o código para não travar o teste do administrador
      previewCode: wacliResult.mockMode ? verificationCode : undefined,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro interno ao processar cadastro.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}

