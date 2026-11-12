import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "Sessão encerrada com sucesso.",
  });

  response.cookies.delete("hospede_customer_session");
  return response;
}

