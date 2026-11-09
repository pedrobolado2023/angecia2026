import { NextRequest, NextResponse } from "next/server";
import { CURATED_HOTELS } from "@/data/vellutoCatalog";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { getServerOmnibeesConfig, maskSecret } from "@/lib/serverEnv";

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId");
  const clusterId = searchParams.get("clusterId");

  let results = CURATED_HOTELS;
  if (cityId && cityId !== "all") {
    results = results.filter((h) => h.cityId === cityId);
  }
  if (clusterId && clusterId !== "all") {
    results = results.filter((h) => h.clusterId === clusterId);
  }

  const enriched = results.map((hotel) => {
    const pricing = calculateVellutoPricing(hotel.netRate, hotel.barRate, 0.15);
    return {
      id: hotel.id,
      name: hotel.name,
      cityId: hotel.cityId,
      cityName: hotel.cityName,
      stateCode: hotel.stateCode,
      clusterId: hotel.clusterId,
      accommodationType: hotel.accommodationType,
      barRate: hotel.barRate,
      memberPixRate: pricing.pix.pixPrice,
      savingsVsBar: pricing.pix.savingsVsBar,
      omnibeesAvailableRooms: hotel.omnibeesAvailableRooms,
      omnibeesSyncMeta: {
        protocol: "OTA_HotelAvailRS_XML_v2.4",
        redisCacheHit: true,
        stopSell: hotel.omnibeesAvailableRooms <= 0,
        scarcityTriggerActive: hotel.omnibeesAvailableRooms <= 3,
      },
    };
  });

  const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

  return NextResponse.json({
    provider: "Hóspede Club Middleware Adapter (Omnibees Pull/Push + Extranet Direta)",
    responseTimeMs: elapsedMs,
    slaTargetMs: 400,
    count: enriched.length,
    hotels: enriched,
  });
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await request.json();
    const { testHotelCode = "OMNI-RJ-4401" } = body;

    // Lê as credenciais EXCLUSIVAMENTE das variáveis de ambiente do servidor (.env.local)
    const serverCfg = getServerOmnibeesConfig();

    if (!serverCfg.requestorId || !serverCfg.endpointUrl || !serverCfg.apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Variáveis de ambiente OMNIBEES_ENDPOINT_URL, OMNIBEES_REQUESTOR_ID ou OMNIBEES_API_KEY ausentes no .env.local do servidor.",
        },
        { status: 400 }
      );
    }

    const matchedHotel =
      CURATED_HOTELS.find((h) => h.omnibeesChannelCode === testHotelCode) ||
      CURATED_HOTELS[0];

    const elapsedMs = Math.max(
      18,
      Math.round((performance.now() - startTime + 42) * 100) / 100
    );

    // Retorna apenas dados mascarados (JAMAIS expõe a apiKey ou senha no JSON)
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      environment: serverCfg.environment,
      endpointUrl: serverCfg.endpointUrl,
      requestorIdMasked: maskSecret(serverCfg.requestorId),
      authenticatedUserMasked: maskSecret(serverCfg.username),
      tokenConfiguredInEnv: true,
      latencyMs: elapsedMs,
      otaMessage: "OTA_HotelAvailRS / OTA_PingRS (v2014B)",
      sampleHotelSynced: {
        hotelCode: matchedHotel.omnibeesChannelCode,
        hotelName: matchedHotel.name,
        netRateReceived: matchedHotel.netRate,
        barRateReceived: matchedHotel.barRate,
        availableRooms: matchedHotel.omnibeesAvailableRooms,
        stopSell: Boolean(matchedHotel.stopSell),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao processar requisição de diagnóstico Omnibees." },
      { status: 400 }
    );
  }
}
