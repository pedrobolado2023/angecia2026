import { NextRequest, NextResponse } from "next/server";
import { getServerOmnibeesConfig, getMaskedEnvStatusForAdmin } from "@/lib/serverEnv";
import { adminHeaders, adminRetryAfter, allowAdminLoginAttempt, authenticatedAdmin, clearAdminSession,
  constantTimeEqual, sameOriginAdminRequest, setAdminSession } from "@/lib/adminSession";

export async function GET(request: NextRequest) {
  const authenticated = await authenticatedAdmin(request, { allowMachine: true });
  return NextResponse.json(authenticated ? { authenticated, maskedEnv: getMaskedEnvStatusForAdmin() } :
    { authenticated: false, message: "Sessão administrativa não iniciada ou expirada." }, { headers: adminHeaders });
}

export async function POST(request: NextRequest) {
  if (!sameOriginAdminRequest(request)) return NextResponse.json({ ok: false, error: "Origem da solicitação inválida." }, { status: 403, headers: adminHeaders });
  const cfg = getServerOmnibeesConfig();
  if (!cfg.adminPasscode) return NextResponse.json({ ok: false, error: "Administração temporariamente indisponível." }, { status: 503, headers: adminHeaders });
  try {
    if (!(await allowAdminLoginAttempt(request))) return NextResponse.json({ ok: false, error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
      { status: 429, headers: { ...adminHeaders, "Retry-After": adminRetryAfter } });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ ok: false, error: "Solicitação inválida." }, { status: 415, headers: adminHeaders });
    }
    const reader = request.body?.getReader();
    let content = "";
    let size = 0;
    const decoder = new TextDecoder();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return NextResponse.json({ ok: false, error: "Solicitação inválida." }, { status: 413, headers: adminHeaders });
        }
        content += decoder.decode(value, { stream: true });
      }
      content += decoder.decode();
    }
    let body;
    try { body = JSON.parse(content); } catch {
      return NextResponse.json({ ok: false, error: "Solicitação inválida." }, { status: 400, headers: adminHeaders });
    }
    if (typeof body?.passcode !== "string" || body.passcode.length > 256 || !constantTimeEqual(body.passcode.trim(), cfg.adminPasscode)) {
      return NextResponse.json({ ok: false, authenticated: false, error: "Credenciais administrativas inválidas." }, { status: 401, headers: adminHeaders });
    }
    const response = NextResponse.json({ ok: true, authenticated: true, maskedEnv: getMaskedEnvStatusForAdmin() }, { headers: adminHeaders });
    await setAdminSession(request, response);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Administração temporariamente indisponível." }, { status: 503, headers: adminHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOriginAdminRequest(request)) return NextResponse.json({ ok: false }, { status: 403, headers: adminHeaders });
  try {
    const response = NextResponse.json({ ok: true, authenticated: false }, { headers: adminHeaders });
    await clearAdminSession(request, response);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível encerrar a sessão. Tente novamente." }, { status: 503, headers: adminHeaders });
  }
}
