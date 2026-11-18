import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hotelbedsCatalogStatus, runHotelbedsCatalogStep } from "@/lib/hotelbedsCatalogSync";
import { getServerOmnibeesConfig } from "@/lib/serverEnv";

const headers = { "Cache-Control": "private, no-store" };

function authorized(request: NextRequest) {
  const expected = getServerOmnibeesConfig().adminSessionSecret;
  const supplied = request.headers.get("x-hospede-admin-token") || request.cookies.get("hospede_admin_session")?.value;
  if (!expected || !supplied) return false;
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401, headers });
  try {
    return NextResponse.json(await hotelbedsCatalogStatus(), { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o catálogo." }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request) || (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401, headers });
  }
  try {
    return NextResponse.json(await runHotelbedsCatalogStep(), { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível executar a sincronização." }, { status: 503, headers });
  }
}
