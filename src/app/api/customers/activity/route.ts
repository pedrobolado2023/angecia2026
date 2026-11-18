import { authenticatedAdmin, adminHeaders } from "@/lib/adminSession";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/customerSession";
import {
  recordCustomerActivity,
  createCampaignBroadcast,
  CampaignBroadcastRecord,
} from "@/lib/customerStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      activityType,
      payload = {},
    } = body;

    // Criação de Campanha de Membros (exclusivo Admin autenticado)
    if (activityType === "CREATE_CAMPAIGN") {
      if (!(await authenticatedAdmin(request, { mutation: true, allowMachine: true }))) {
        return NextResponse.json(
          { ok: false, error: "Sessão administrativa necessária para criar campanhas." },
          { status: 401, headers: adminHeaders }
        );
      }

      const campaign = createCampaignBroadcast({
        title: String(payload.title || "Campanha Exclusiva Hóspede Club"),
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
      }, { headers: adminHeaders });
    }

    const customer = await authenticatedCustomer(request);
    if (!customer) return NextResponse.json({ ok: false }, { status: 401 });
    const updatedCustomer = recordCustomerActivity({
      customerId: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      whatsapp: customer.whatsapp,
      cityOrigin: customer.cityOrigin,
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

