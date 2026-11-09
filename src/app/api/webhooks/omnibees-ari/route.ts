import { NextRequest, NextResponse } from "next/server";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { getServerOmnibeesConfig } from "@/lib/serverEnv";

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await request.json();
    const {
      messageType = "OTA_HotelRateAmountNotifRQ",
      hotelCode = "OMNI-RJ-4401",
      newNetRate = 1630,
      newBarRate = 2400,
      newAvailableRooms = 2,
      stopSell = false,
      webhookSecret,
      internalServerTest = false,
    } = body;

    const serverCfg = getServerOmnibeesConfig();
    const cookieToken =
      request.cookies.get("hospede_admin_session")?.value ||
      request.cookies.get("velluto_admin_session")?.value;

    // Permite teste autenticado pelo Admin usando a variável de ambiente do próprio servidor
    // ou chamada externa da Omnibees validando o header/token contra process.env.OMNIBEES_WEBHOOK_SECRET
    const isAuthorizedInternalTest =
      internalServerTest && cookieToken === serverCfg.adminSessionSecret;
    const isAuthorizedExternalWebhook =
      webhookSecret && webhookSecret === serverCfg.webhookSecret;

    if (!isAuthorizedInternalTest && !isAuthorizedExternalWebhook) {
      return NextResponse.json(
        {
          ok: false,
          otaResponse: "OTA_ErrorRS",
          error:
            "Assinatura HMAC do Webhook Omnibees inválida ou diferente de OMNIBEES_WEBHOOK_SECRET no servidor (HTTP 401).",
        },
        { status: 401 }
      );
    }

    // Trava de segurança Agente 02: Impede que erro de digitação no PMS do hotel (Tarifa Zero/Negativa) vá ao ar
    const pricing = calculateVellutoPricing(Number(newNetRate), Number(newBarRate), 0.15);

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return NextResponse.json({
      ok: true,
      otaResponse:
        messageType === "OTA_HotelAvailNotifRQ"
          ? "OTA_HotelAvailNotifRS"
          : "OTA_HotelRateAmountNotifRS",
      status: "Success",
      echoToken: `OMNI-PUSH-${Date.now()}`,
      processedInMs: elapsedMs,
      hotelCode,
      ratePlanNetCode: serverCfg.ratePlanNetCode,
      updatedState: {
        netRate: Number(newNetRate),
        barRate: Number(newBarRate),
        calculatedPixMemberPrice: pricing.pix.pixPrice,
        netProfitGuaranteed: pricing.pix.netProfitAmount,
        availableRooms: stopSell ? 0 : Number(newAvailableRooms),
        stopSell: Boolean(stopSell || Number(newAvailableRooms) <= 0),
      },
      xmlAck: `<?xml version="1.0" encoding="UTF-8"?>\n<${
        messageType === "OTA_HotelAvailNotifRQ"
          ? "OTA_HotelAvailNotifRS"
          : "OTA_HotelRateAmountNotifRS"
      } xmlns="http://www.opentravel.org/OTA/2003/05" Version="2.001" TimeStamp="${new Date().toISOString()}">\n  <Success />\n</${
        messageType === "OTA_HotelAvailNotifRQ"
          ? "OTA_HotelAvailNotifRS"
          : "OTA_HotelRateAmountNotifRS"
      }>`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        otaResponse: "OTA_HotelRateAmountNotifRS",
        error:
          err instanceof Error
            ? err.message
            : "Erro ao processar notificação ARI da Omnibees.",
      },
      { status: 400 }
    );
  }
}
