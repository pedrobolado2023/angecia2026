import { NextRequest, NextResponse } from "next/server";
import { CURATED_HOTELS } from "@/data/vellutoCatalog";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { upsertCustomerProfile, recordCustomerActivity } from "@/lib/customerStore";

// Memória em tempo de execução para controle atômico de estoque (Anti-Overbooking Gate 3)
const runtimeInventory: Record<string, number> = {};
CURATED_HOTELS.forEach((h) => {
  runtimeInventory[h.id] = h.omnibeesAvailableRooms;
});

export async function POST(request: NextRequest) {
  const startMs = performance.now();
  try {
    const body = await request.json();
    const {
      hotelId,
      roomId,
      nights = 2,
      guests = 2,
      checkInDate = "2026-11-13",
      paymentModality = "PIX",
      installments = 1,
      guestName,
      guestEmail,
      guestWhatsapp = "+55 (11) 99812-4400",
      cityOrigin = "São Paulo (SP)",
      voucherCode,
    } = body;

    const hotel = CURATED_HOTELS.find((h) => h.id === hotelId);
    if (!hotel) {
      return NextResponse.json({ error: "Hotel não encontrado no catálogo." }, { status: 404 });
    }

    const currentStock = runtimeInventory[hotel.id] ?? hotel.omnibeesAvailableRooms;
    if (currentStock <= 0 || hotel.stopSell) {
      return NextResponse.json(
        {
          status: "OVERBOOKING_PREVENTED_BY_AGENT_03",
          error:
            "[GATE 3 ANTI-OVERBOOKING BLOCK] Último quarto já foi vendido ou hotel em Stop Sell na Omnibees.",
          availableRooms: 0,
        },
        { status: 409 }
      );
    }

    const room = hotel.rooms.find((r) => r.id === roomId) || hotel.rooms[0];
    const pricing = calculateVellutoPricing(
      room.netRate,
      room.barRate,
      0.15,
      hotel.cleaningFee || 0,
      hotel.securityDeposit || 0
    );

    // Trava atômica de 1 unidade no inventário
    runtimeInventory[hotel.id] = currentStock - 1;

    const bookingId = `BK-${Date.now()}`;
    const generatedVoucher =
      voucherCode || `VL-${Math.floor(100000 + Math.random() * 900000)}-OMNI`;

    const extraFees = (hotel.cleaningFee || 0) + (hotel.securityDeposit || 0);
    const totalPaid =
      paymentModality === "PIX"
        ? pricing.pix.pixPrice * nights + extraFees
        : pricing.creditCard.installments[Math.min(11, Math.max(0, installments - 1))]
            .totalCharged *
            nights +
          extraFees;

    const cashbackEarned =
      paymentModality === "PIX" ? pricing.pix.cashbackNextBooking * nights : 0;

    // Salva automaticamente o cadastro do cliente e a reserva no CRM do Backend (quando houver dados reais do cliente)
    if (guestName && guestEmail && !guestEmail.includes("gate3@")) {
      const savedMember = upsertCustomerProfile({
        fullName: guestName,
        email: guestEmail,
        whatsapp: guestWhatsapp,
        cityOrigin,
        preferredDestinations: [hotel.cityName],
        authMethod: "Checkout Direto",
        marketingOptIn: true,
      });

      recordCustomerActivity({
        customerId: savedMember.id,
        email: savedMember.email,
        activityType: "BOOKING_CONFIRMED",
        payload: {
          bookingId,
          voucherCode: generatedVoucher,
          hotelId: hotel.id,
          hotelName: hotel.name,
          roomName: room.name,
          checkInDate,
          nights,
          guests,
          paymentMethod: paymentModality === "PIX" ? "PIX" : "CARD",
          totalPaid,
          cashbackEarned,
        },
      });
    }

    const elapsedMs = Math.round((performance.now() - startMs) * 100) / 100;

    return NextResponse.json({
      status: "INVENTORY_LOCKED_AWAITING_WEBHOOK",
      bookingId,
      voucherCode: generatedVoucher,
      responseTimeMs: elapsedMs,
      remainingRoomsAfterLock: runtimeInventory[hotel.id],
      stopSellTriggered: runtimeInventory[hotel.id] === 0,
      guest: { guestName, guestEmail },
      financialAudit: {
        nights,
        paymentModality,
        installments,
        netRatePerNight: pricing.netRate,
        cleaningFeeSegregated: pricing.villaFees.cleaningFee,
        securityDepositSegregated: pricing.villaFees.securityDeposit,
        guaranteedNetMarginPercent:
          paymentModality === "PIX"
            ? pricing.pix.netMarginOnNetPercent
            : pricing.creditCard.installments[Math.min(11, Math.max(0, installments - 1))]
                .netMarginOnNetPercent,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao processar reserva.";
    return NextResponse.json({ status: "ERROR", error: message }, { status: 400 });
  }
}
