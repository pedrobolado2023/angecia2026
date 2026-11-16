import { NextRequest, NextResponse } from "next/server";
import { registerCustomerProfile, CustomerAddress } from "@/lib/customerStore";
import { sendWhatsAppVerificationCode } from "@/lib/wacliService";
import { customerSessionConfigured } from "@/lib/customerSession";
import { findCustomerInPostgres, getPostgresPool, saveCustomerToPostgres } from "@/lib/postgres";

export async function POST(request: NextRequest) {
  if (!customerSessionConfigured()) {
    return NextResponse.json({ ok: false, error: "Cadastro temporariamente indisponível." }, { status: 503 });
  }
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

    if ([fullName, whatsapp, cpf, email, password].some((value) => typeof value !== "string") ||
        fullName.length > 160 || email.length > 254 || whatsapp.length > 40 || cpf.length > 25 || password.length > 256) {
      return NextResponse.json({ ok: false, error: "Confira os dados do cadastro." }, { status: 400 });
    }

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

    const db = getPostgresPool();
    if (db && (await findCustomerInPostgres(email) || await findCustomerInPostgres(cleanCpf))) {
      return NextResponse.json({ ok: false, error: "Cadastro já existente. Entre ou solicite outro código." }, { status: 409 });
    }

    // Registra o perfil e gera o código de 6 dígitos
    const { customer, verificationCode } = registerCustomerProfile({
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      cpf: cpf.trim(),
      email: email.trim(),
      password: password ? String(password).trim() : undefined,
      address: customerAddress,
    });

    if (db) {
      const persisted = await saveCustomerToPostgres(customer, verificationCode);
      if (!persisted.success) {
        return NextResponse.json({ ok: false, error: "Não foi possível concluir o cadastro." }, { status: 409 });
      }
    }

    const delivery = await sendWhatsAppVerificationCode({
      phone: customer.whatsapp, code: verificationCode, customerName: customer.fullName,
    });
    return NextResponse.json({
      ok: true,
      customerId: customer.id,
      message: delivery.success && !delivery.mockMode
        ? "Enviamos um código para o seu WhatsApp. Confirme o código para entrar."
        : "Cadastro pendente de confirmação. Não foi possível enviar o código agora. Solicite o reenvio.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível concluir o cadastro." }, { status: 400 });
  }
}
