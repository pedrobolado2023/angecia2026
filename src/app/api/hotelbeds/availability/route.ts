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

interface AvailabilityCacheItem {
  timestamp: number;
  payload: any;
}
const availabilityMemoryCache = new Map<string, AvailabilityCacheItem>();
const AVAILABILITY_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn") || "2026-11-20";
    const checkOut = searchParams.get("checkOut") || "2026-11-22";
    const destinationCode = searchParams.get("destinationCode") || "RIO";
    const adults = Math.max(1, Number(searchParams.get("adults") || "2"));
    const children = Math.max(0, Number(searchParams.get("children") || "0"));
    const hotelCodesParam = searchParams.get("hotelCodes");
    const hotelCodes = hotelCodesParam ? hotelCodesParam.split(",") : undefined;
    const forceRefresh = searchParams.get("refresh") === "true";

    const cacheKey = `${destinationCode.toUpperCase()}_${checkIn}_${checkOut}_${adults}_${children}_${(hotelCodes || []).join(",")}`;
    const cached = availabilityMemoryCache.get(cacheKey);
    const now = Date.now();

    // Retorna do cache se estiver dentro do TTL e não for um refresh forçado
    if (!forceRefresh && cached && now - cached.timestamp < AVAILABILITY_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }

    const result = await searchHotelbedsAvailability({
      checkIn,
      checkOut,
      destinationCode,
      hotelCodes,
      occupancies: [{ rooms: 1, adults, children }],
    });

    const enrichedHotels = enrichHotelsWithClubPricing(result.hotels || []);

    const responsePayload = {
      ok: result.ok,
      isSimulation: result.isSimulation,
      message: result.message,
      checkIn: result.checkIn,
      checkOut: result.checkOut,
      total: result.total,
      hotels: enrichedHotels,
      rawError: result.rawError,
    };

    // Se a API ao vivo retornou com sucesso, armazena no cache
    if (result.ok && !result.isSimulation && enrichedHotels.length > 0) {
      availabilityMemoryCache.set(cacheKey, { timestamp: now, payload: responsePayload });
    } else if (cached && cached.payload && (!result.ok || result.isSimulation)) {
      // Se a Hotelbeds estourou a cota ou falhou, mas temos cache anterior ao vivo, serve o cache anterior
      return NextResponse.json(cached.payload);
    }

    return NextResponse.json(responsePayload);
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
