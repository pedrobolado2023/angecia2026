import { NextRequest, NextResponse } from "next/server";
import {
  getServerOmnibeesConfig,
  getMaskedEnvStatusForAdmin,
} from "@/lib/serverEnv";

export async function GET(request: NextRequest) {
  const cfg = getServerOmnibeesConfig();
  const cookieToken = request.cookies.get("velluto_admin_session")?.value;
  const headerToken = request.headers.get("x-velluto-admin-token");

  const isAuthenticated =
    Boolean(cfg.adminSessionSecret) &&
    (cookieToken === cfg.adminSessionSecret ||
      headerToken === cfg.adminSessionSecret);

  if (!isAuthenticated) {
    return NextResponse.json(
      {
        authenticated: false,
        message: "Sessão administrativa não iniciada.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    maskedEnv: getMaskedEnvStatusForAdmin(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passcode = "" } = body;
    const cfg = getServerOmnibeesConfig();

    if (!passcode || passcode.trim() !== cfg.adminPasscode) {
      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          error:
            "Chave de acesso inválida. Verifique a variável VELLUTO_ADMIN_PASSCODE no .env.local do servidor.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      maskedEnv: getMaskedEnvStatusForAdmin(),
    });

    response.cookies.set("velluto_admin_session", cfg.adminSessionSecret, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 horas
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro ao validar credencial administrativa." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.delete("velluto_admin_session");
  return response;
}

