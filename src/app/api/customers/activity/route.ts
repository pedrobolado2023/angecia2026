import { NextRequest, NextResponse } from "next/server";
import { getServerOmnibeesConfig } from "@/lib/serverEnv";
import {
  recordCustomerActivity,
  createCampaignBroadcast,
  CampaignBroadcastRecord,
} from "@/lib/customerStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      email,
      fullName,
      whatsapp,
      cityOrigin,
      activityType,
      payload = {},
    } = body;

    // Criação de Campanha de Membros (exclusivo Admin autenticado)
    if (activityType === "CREATE_CAMPAIGN") {
      const cfg = getServerOmnibeesConfig();
      const cookieToken = request.cookies.get("velluto_admin_session")?.value;
      const headerToken = request.headers.get("x-velluto-admin-token");
      if (
        !cfg.adminSessionSecret ||
        (cookieToken !== cfg.adminSessionSecret &&
          headerToken !== cfg.adminSessionSecret)
      ) {
        return NextResponse.json(
          { ok: false, error: "Sessão administrativa necessária para criar campanhas." },
          { status: 401 }
        );
      }

      const campaign = createCampaignBroadcast({
        title: String(payload.title || "Campanha Exclusiva Velluto Club"),
        channel: (payload.channel as CampaignBroadcastRecord["channel"]) || "WhatsApp VIP",
        segmentFilter: String(payload.segmentFilter || "Todos os Membros Opt-in"),
        discountOffer: String(payload.discountOffer || "Até 27% OFF + 3% Cashback PIX"),
        destinationFocus: String(payload.destinationFocus || "Seleção Nacional"),
        messageTemplate: String(payload.messageTemplate || ""),
        recipientsCount: Number(payload.recipientsCount || 1),
      });

      return NextResponse.json({
        ok: true,
        campaign,
      });
    }

    const updatedCustomer = recordCustomerActivity({
      customerId,
      email,
      fullName,
      whatsapp,
      cityOrigin,
      activityType,
      payload,
    });

    return NextResponse.json({
      ok: true,
      recordedAt: new Date().toISOString(),
      activityType,
      customerId: updatedCustomer?.id || null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao registrar atividade do cliente no backend." },
      { status: 400 }
    );
  }
}

