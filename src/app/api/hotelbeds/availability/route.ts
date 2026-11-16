import { NextRequest, NextResponse } from "next/server";
import { findBrazilHotelbedsCodes, searchHotelbedsAvailability } from "@/lib/hotelbeds";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { getSyncExchangeRateToBRL } from "@/lib/currency";

function enrichHotelsWithClubPricing(hotels: any[]) {
  return hotels.map((hotel) => {
    // Camada de segurança cambial: se o hotel vier em moeda estrangeira sem conversão prévia, converte para BRL
    const rawCurrency = (hotel.originalCurrency || hotel.currency || "BRL").trim().toUpperCase();
    const fxMultiplier = (hotel.currency === "BRL" && !hotel.originalCurrency) ? 1.0 : (hotel.fxRateToBRL || getSyncExchangeRateToBRL(rawCurrency));
    const isAlreadyConverted = hotel.currency === "BRL" && hotel.fxRateToBRL;

    const netRate = isAlreadyConverted
      ? Math.max(1, Number(hotel.minRate || 100))
      : Math.max(1, Math.round(Number(hotel.minRate || 100) * fxMultiplier * 100) / 100);

    const barRate = Math.max(
      Math.round(netRate * 1.3),
      isAlreadyConverted
        ? Number(hotel.maxRate || Math.round(netRate * 1.45))
        : Math.round(Number(hotel.maxRate || Math.round(netRate * 1.45)) * fxMultiplier * 100) / 100
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
const dateInBrazil = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";
    const destinationCode = searchParams.get("destinationCode") || "RIO";
    const adults = Math.max(1, Number(searchParams.get("adults") || "2"));
    const children = Math.max(0, Number(searchParams.get("children") || "0"));
    const infants = Math.max(0, Number(searchParams.get("infants") || "0"));
    if (![adults, children, infants].every(Number.isSafeInteger) || adults > 20 || children + infants > 20 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) ||
        checkIn < dateInBrazil() || checkOut <= checkIn) {
      return NextResponse.json({ ok: false, message: "Confira as datas e o número de hóspedes." }, { status: 400 });
    }
    const hotelCodesParam = searchParams.get("hotelCodes");
    const hotelCodes = hotelCodesParam ? hotelCodesParam.split(",") : undefined;
    const property = (searchParams.get("property") || "").trim().slice(0, 120);
    const forceRefresh = searchParams.get("refresh") === "true";

    const cacheKey = JSON.stringify([destinationCode.toUpperCase(), checkIn, checkOut, adults, children, infants, hotelCodes, property]);
    const cached = availabilityMemoryCache.get(cacheKey);
    const now = Date.now();

    // Retorna do cache se estiver dentro do TTL e não for um refresh forçado
    if (!forceRefresh && cached && now - cached.timestamp < AVAILABILITY_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }

    const options = {
      checkIn,
      checkOut,
      destinationCode,
      hotelCodes,
      occupancies: [{
        rooms: 1, adults, children: children + infants,
        ...(children + infants > 0 ? {
          paxes: [
            ...Array.from({ length: children }, () => ({ type: "CH" as const, age: 8 })),
            ...Array.from({ length: infants }, () => ({ type: "CH" as const, age: 1 })),
          ],
        } : {}),
      }],
    };
    let result;
    if (property && !hotelCodes) {
      const codes = await findBrazilHotelbedsCodes(property).catch((error) => {
        console.warn("[Hotelbeds] Busca no catálogo nacional indisponível:", error instanceof Error ? error.message : error);
        return null;
      });
      if (!codes?.length) {
        // Neighborhood names are not always present in the catalog's city field.
        result = await searchHotelbedsAvailability(options);
        if (!codes) result.contentIncomplete = true;
      } else {
        const batches = [];
        for (let offset = 0; offset < codes.length; offset += 2000) {
          batches.push(await searchHotelbedsAvailability({ ...options, hotelCodes: codes.slice(offset, offset + 2000) }));
        }
        const hotels = [...new Map(batches.flatMap((batch) => batch.hotels).map((hotel) => [hotel.code, hotel])).values()];
        result = {
          ok: batches.some((batch) => batch.ok), isSimulation: false, checkIn, checkOut, hotels, total: hotels.length,
          contentIncomplete: batches.some((batch) => !batch.ok || batch.contentIncomplete),
          message: batches.find((batch) => !batch.ok)?.message,
        };
      }
    } else {
      result = await searchHotelbedsAvailability(options);
    }

    const enrichedHotels = enrichHotelsWithClubPricing(result.hotels || []);

    const responsePayload = {
      ok: result.ok,
      isSimulation: result.isSimulation,
      message: result.message,
      checkIn: result.checkIn,
      checkOut: result.checkOut,
      total: result.total,
      hotels: enrichedHotels,
      contentIncomplete: result.contentIncomplete,
    };

    if (result.ok && !result.contentIncomplete) {
      if (availabilityMemoryCache.size >= 256) {
        const oldest = availabilityMemoryCache.keys().next().value;
        if (oldest !== undefined) availabilityMemoryCache.delete(oldest);
      }
      availabilityMemoryCache.set(cacheKey, { timestamp: Date.now(), payload: responsePayload });
    }
    return NextResponse.json(responsePayload, { status: result.ok ? 200 : 502 });
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
      contentIncomplete: result.contentIncomplete,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Erro ao consultar Hotelbeds";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
