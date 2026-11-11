import { NextRequest, NextResponse } from "next/server";
import { searchHotelbedsAvailability } from "@/lib/hotelbeds";
import { calculateVellutoPricing } from "@/lib/pricingEngine";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn") || "2026-11-20";
  const checkOut = searchParams.get("checkOut") || "2026-11-22";
  const destinationCode = searchParams.get("destinationCode") || "RIO";
  const hotelCodesParam = searchParams.get("hotelCodes");
  const hotelCodes = hotelCodesParam ? hotelCodesParam.split(",") : undefined;

  const result = await searchHotelbedsAvailability({
    checkIn,
    checkOut,
    destinationCode,
    hotelCodes,
  });

  // Enriquece os hotéis com a inteligência de pricing Hóspede Club (Margem Segregada de 15%)
  const enrichedHotels = result.hotels.map((hotel) => {
    const netRate = hotel.minRate || 1000;
    const barRate = hotel.maxRate || netRate * 1.45;
    const pricing = calculateVellutoPricing(netRate, barRate, 0.15);

    return {
      ...hotel,
      hospedeClubPricing: {
        netRate,
        barRate,
        memberPixPrice: pricing.pix.pixPrice,
        savingsVsBar: pricing.pix.savingsVsBar,
        savingsPercent: pricing.pix.savingsVsBarPercent,
        creditCardInstallments: pricing.creditCard.installments,
      },
    };
  });

  return NextResponse.json({
    ok: result.ok,
    isSimulation: result.isSimulation,
    message: result.message,
    checkIn: result.checkIn,
    checkOut: result.checkOut,
    total: result.total,
    hotels: enrichedHotels,
    rawError: result.rawError,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      checkIn = "2026-11-20",
      checkOut = "2026-11-22",
      destinationCode = "RIO",
      hotelCodes,
      occupancies,
    } = body;

    const result = await searchHotelbedsAvailability({
      checkIn,
      checkOut,
      destinationCode,
      hotelCodes,
      occupancies,
    });

    const enrichedHotels = result.hotels.map((hotel) => {
      const netRate = hotel.minRate || 1000;
      const barRate = hotel.maxRate || netRate * 1.45;
      const pricing = calculateVellutoPricing(netRate, barRate, 0.15);

      return {
        ...hotel,
        hospedeClubPricing: {
          netRate,
          barRate,
          memberPixPrice: pricing.pix.pixPrice,
          savingsVsBar: pricing.pix.savingsVsBar,
          savingsPercent: pricing.pix.savingsVsBarPercent,
          creditCardInstallments: pricing.creditCard.installments,
        },
      };
    });

    return NextResponse.json({
      ok: result.ok,
      isSimulation: result.isSimulation,
      message: result.message,
      checkIn: result.checkIn,
      checkOut: result.checkOut,
      total: result.total,
      hotels: enrichedHotels,
      rawError: result.rawError,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao consultar Hotelbeds";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
