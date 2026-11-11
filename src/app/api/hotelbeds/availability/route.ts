import { NextRequest, NextResponse } from "next/server";
import { searchHotelbedsAvailability } from "@/lib/hotelbeds";
import { calculateVellutoPricing } from "@/lib/pricingEngine";

function enrichHotelsWithClubPricing(hotels: any[]) {
  return hotels.map((hotel) => {
    const netRate = Math.max(1, Number(hotel.minRate || 100));
    const barRate = Math.max(
      Math.round(netRate * 1.3),
      Number(hotel.maxRate || Math.round(netRate * 1.45))
    );

    let clubPricing;
    try {
      const p = calculateVellutoPricing(netRate, barRate, 0.15);
      clubPricing = {
        netRate,
        barRate,
        memberPixPrice: p.pix.pixPrice,
        savingsVsBar: p.pix.savingsVsBar,
        savingsPercent: p.pix.savingsVsBarPercent,
        creditCardInstallments: p.creditCard.installments,
      };
    } catch {
      const pixPrice = Math.round(netRate * 1.15 * 100) / 100;
      clubPricing = {
        netRate,
        barRate,
        memberPixPrice: pixPrice,
        savingsVsBar: Math.round((barRate - pixPrice) * 100) / 100,
        savingsPercent: Math.round(((barRate - pixPrice) / barRate) * 100),
        creditCardInstallments: Array.from({ length: 12 }, (_, i) => {
          const total = Math.round(netRate * 1.25 * 100) / 100;
          return {
            installmentNumber: i + 1,
            monthlyAmount: Math.round((total / (i + 1)) * 100) / 100,
            totalCharged: total,
          };
        }),
      };
    }

    return {
      ...hotel,
      hospedeClubPricing: clubPricing,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
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

    const enrichedHotels = enrichHotelsWithClubPricing(result.hotels || []);

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
    const msg =
      err instanceof Error ? err.message : "Erro ao consultar Hotelbeds";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
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

    const enrichedHotels = enrichHotelsWithClubPricing(result.hotels || []);

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
    const msg =
      err instanceof Error ? err.message : "Erro ao consultar Hotelbeds";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
