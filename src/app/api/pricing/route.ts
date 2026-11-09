import { NextRequest, NextResponse } from "next/server";
import { calculateVellutoPricing } from "@/lib/pricingEngine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const netRate = Number(body.netRate);
    const barRate = body.barRate ? Number(body.barRate) : undefined;
    const customMarkup = body.markup ? Number(body.markup) : 0.15;

    const pricing = calculateVellutoPricing(netRate, barRate, customMarkup);
    return NextResponse.json({
      status: "APPROVED_BY_AGENT_02",
      timestamp: new Date().toISOString(),
      pricing,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro no motor de precificação.";
    return NextResponse.json(
      {
        status: "BLOCKED_BY_FINOPS_GUARDRAIL",
        error: message,
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const netRate = Number(searchParams.get("netRate") || "1630");
  const barRate = Number(searchParams.get("barRate") || "2400");

  try {
    const pricing = calculateVellutoPricing(netRate, barRate, 0.15);
    return NextResponse.json({
      status: "APPROVED_BY_AGENT_02",
      pricing,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro de validação financeira.";
    return NextResponse.json({ status: "BLOCKED", error: message }, { status: 400 });
  }
}

