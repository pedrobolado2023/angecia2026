import { authenticatedAdmin } from "@/lib/adminSession";
import { NextRequest, NextResponse } from "next/server";
import { hotelbedsCatalogStatus, runHotelbedsCatalogStep } from "@/lib/hotelbedsCatalogSync";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  if (!(await authenticatedAdmin(request, { allowMachine: true }))) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401, headers });
  try {
    return NextResponse.json(await hotelbedsCatalogStatus(), { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o catálogo." }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticatedAdmin(request, { mutation: true, allowMachine: true }))) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401, headers });
  }
  try {
    return NextResponse.json(await runHotelbedsCatalogStep(), { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível executar a sincronização." }, { status: 503, headers });
  }
}
