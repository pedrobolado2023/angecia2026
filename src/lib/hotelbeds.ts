import { getHotelbedsConfig, generateHotelbedsSignature } from "./hotelbedsConfig";
import { fetchHotelbedsContent, getCachedHotelbedsContent } from "./hotelbedsContent";
import { translateHotelbedsRoomName } from "./hotelbedsRoomName";
import { fetchLiveExchangeRates } from "./currency";
import { signHotelbedsOffer } from "./hotelbedsOffer";
import { readVoucherSupplier, supplierVoucherNotice } from "./hotelbedsVoucherData";
import { fetchHotelbedsBooking, hotelbedsBookingBaseUrl } from "./hotelbedsBookingTransport";

export interface HotelbedsOccupancy {
  rooms: number;
  adults: number;
  children?: number;
  paxes?: { type: "CH"; age: number }[];
}

export interface HotelbedsStay {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface HotelbedsRate {
  offerToken?: string;
  rateKey: string;
  rateClass: string;
  rateType: string;
  net: number;
  sellingRate?: number;
  hotelMandatory?: boolean;
  allotted?: number;
  paymentType?: string;
  boardCode: string;
  boardName: string;
  originalNet?: number;
  originalCurrency?: string;
  fxRate?: number;
  packaging?: boolean;
  rateComments?: string;
  supplierCancellationPolicies?: { amount: string; from: string }[];
  cancellationPolicies?: Array<{
    amount: number;
    from: string;
  }>;
}

export interface HotelbedsRoom {
  code: string;
  name: string;
  heroImage?: string;
  gallery?: string[];
  rates: HotelbedsRate[];
}

export interface HotelbedsContentData {
  code: number | string;
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  heroImage?: string;
  gallery: string[];
  facilities?: string[];
  roomImages?: Record<string, string[]>;
  roomTypeImages?: Record<string, string[]>;
  habImages?: string[];
}

/**
 * Traduz e normaliza fielmente as nomenclaturas técnicas em inglês da Hotelbeds APItude
 * para o português brasileiro elegante do Hóspede Club, sem inventar quartos inexistentes.
 */
export { translateHotelbedsRoomName } from "./hotelbedsRoomName";

export interface HotelbedsHotelResult {
  city?: string;
  code: number | string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  destinationCode: string;
  destinationName: string;
  zoneCode?: number;
  zoneName?: string;
  latitude?: string;
  longitude?: string;
  minRate: number;
  maxRate: number;
  currency: string;
  originalCurrency?: string;
  originalMinRate?: number;
  fxRateToBRL?: number;
  heroImage?: string;
  gallery?: string[];
  description?: string;
  address?: string;
  postalCode?: string;
  facilities?: string[];
  rooms: HotelbedsRoom[];
}

export interface HotelbedsAvailabilityResponse {
  ok: boolean;
  isSimulation: boolean;
  message?: string;
  checkIn: string;
  checkOut: string;
  total: number;
  hotels: HotelbedsHotelResult[];
  rawError?: string;
  contentIncomplete?: boolean;
}

export interface HotelbedsStatusResponse {
  ok: boolean;
  isSimulation: boolean;
  environment: "test" | "production";
  baseUrl: string;
  apiKeyMasked: string;
  latencyMs: number;
  status: string;
  message: string;
}

/**
 * Lê a configuração do Hotelbeds a partir das variáveis de ambiente
 */
export { getHotelbedsConfig, generateHotelbedsSignature } from "./hotelbedsConfig";
export type { HotelbedsConfig } from "./hotelbedsConfig";

export function maskHotelbedsKey(value: string): string {
  if (!value) return "Não configurado no .env";
  if (value.length < 8) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

/**
 * Verifica o status de conectividade com a API da Hotelbeds
 */
export async function checkHotelbedsStatus(): Promise<HotelbedsStatusResponse> {
  const start = performance.now();
  const cfg = getHotelbedsConfig();
  const bookingBaseUrl = hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl);

  // Se não houver credenciais configuradas, retorna modo simulação
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      isSimulation: true,
      environment: cfg.environment,
      baseUrl: bookingBaseUrl,
      apiKeyMasked: "Modo Simulação Ativo (Insira HOTELBEDS_API_KEY)",
      latencyMs: 15,
      status: "SIMULATED_READY",
      message:
        "Hotelbeds APItude operando em modo simulação. Adicione HOTELBEDS_API_KEY e HOTELBEDS_SECRET no Easypanel/.env.local para consultar os hotéis reais.",
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${bookingBaseUrl}/hotel-api/1.0/status`;

    const res = await fetchHotelbedsBooking(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      cache: "no-store",
    });

    const elapsed = Math.round(performance.now() - start);

    if (res.ok) {
      return {
        ok: true,
        isSimulation: false,
        environment: cfg.environment,
        baseUrl: bookingBaseUrl,
        apiKeyMasked: maskHotelbedsKey(cfg.apiKey),
        latencyMs: elapsed,
        status: "ONLINE",
        message:
          "Conexão com a Hotelbeds APItude validada com sucesso! API Key e Assinatura SHA256 aprovadas.",
      };
    }

    const errBody = await res.text();
    return {
      ok: false,
      isSimulation: false,
      environment: cfg.environment,
      baseUrl: bookingBaseUrl,
      apiKeyMasked: maskHotelbedsKey(cfg.apiKey),
      latencyMs: elapsed,
      status: `HTTP_${res.status}`,
      message: `Hotelbeds rejeitou a autenticação (${res.status}): ${errBody}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    return {
      ok: false,
      isSimulation: false,
      environment: cfg.environment,
      baseUrl: bookingBaseUrl,
      apiKeyMasked: maskHotelbedsKey(cfg.apiKey),
      latencyMs: Math.round(performance.now() - start),
      status: "NETWORK_ERROR",
      message: `Erro ao conectar na Hotelbeds: ${msg}`,
    };
  }
}

export { fetchHotelbedsContent, findBrazilHotelbedsCodes } from "./hotelbedsContent";

/**
 * Consulta disponibilidade de hotéis na Hotelbeds
 */
export async function searchHotelbedsAvailability(params: {
  checkIn: string;
  checkOut: string;
  occupancies?: HotelbedsOccupancy[];
  destinationCode?: string;
  hotelCodes?: (number | string)[];
  includeContent?: boolean;
}): Promise<HotelbedsAvailabilityResponse> {
  const cfg = getHotelbedsConfig();
  const occupancies = params.occupancies || [{ rooms: 1, adults: 2, children: 0 }];

  const failure = (rawError: string): HotelbedsAvailabilityResponse => ({
    ok: false,
    isSimulation: false,
    message: "Não foi possível consultar a Hotelbeds. Tente novamente em instantes.",
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    total: 0,
    hotels: [],
    rawError,
  });

  if (!cfg.apiKey || !cfg.secret) return failure("Credenciais Hotelbeds não configuradas");

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/hotels`;

    const requestPayload: Record<string, unknown> = {
      language: "POR",
      stay: {
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      },
      occupancies,
    };

    if (params.hotelCodes && params.hotelCodes.length > 0) {
      requestPayload.hotels = {
        hotel: params.hotelCodes.map((c) => Number(c)),
      };
    } else if (params.destinationCode) {
      requestPayload.destination = {
        code: params.destinationCode,
      };
    } else {
      // Default para RIO se nada for especificado
      requestPayload.destination = {
        code: "RIO",
      };
    }

    const res = await fetchHotelbedsBooking(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Hotelbeds] Erro na busca de disponibilidade (${res.status}):`, errText);
      return failure(`Hotelbeds retornou HTTP ${res.status}`);
    }

    const data = await res.json();
    const hotelsList = data.hotels?.hotels || [];

    const codes = [...new Set<number>(hotelsList.map((h: any) => h.code))];
    const [liveRates, contentMap] = await Promise.all([
      fetchLiveExchangeRates(),
      params.includeContent === false ? getCachedHotelbedsContent(codes) : fetchHotelbedsContent(codes),
    ]);

    const mappedHotels: HotelbedsHotelResult[] = hotelsList.map((h: any) => {
      const content = contentMap[h.code];
      const rawCurrency = (h.currency || "BRL").trim().toUpperCase();
      const fxRate = liveRates[rawCurrency] || 1.0;

      const rawMinRate = Number(h.minRate || 0);
      const rawMaxRate = Number(h.maxRate || 0);
      const minRateBRL = Math.round(rawMinRate * fxRate * 100) / 100;
      const maxRateBRL = Math.round(rawMaxRate * fxRate * 100) / 100;

      return {
        code: h.code,
        name: h.name,
        categoryCode: h.categoryCode,
        categoryName: h.categoryName,
        destinationCode: h.destinationCode,
        destinationName: h.destinationName,
        zoneCode: h.zoneCode,
        zoneName: h.zoneName,
        latitude: h.latitude,
        longitude: h.longitude,
        minRate: minRateBRL,
        maxRate: maxRateBRL,
        currency: "BRL",
        originalCurrency: rawCurrency,
        originalMinRate: rawMinRate,
        fxRateToBRL: fxRate,
        heroImage: content?.heroImage,
        gallery: content?.gallery || [],
        description: content?.description,
        address: content?.address,
        postalCode: content?.postalCode,
        city: content?.city,
        facilities: content?.facilities || [],
        rooms: (h.rooms || []).map((r: any) => {
          const resolvedRoomImages = [...new Set(content?.roomImages?.[r.code] || [])];
          const roomHeroImage = resolvedRoomImages[0];

          return {
            code: r.code,
            name: translateHotelbedsRoomName(r.name),
            heroImage: roomHeroImage,
            gallery: resolvedRoomImages.length > 0 ? resolvedRoomImages : (roomHeroImage ? [roomHeroImage] : []),
            rates: (r.rates || []).map((rate: any) => {
              const rawNet = Number(rate.net || 0);
              const netBRL = Math.round(rawNet * fxRate * 100) / 100;
              const sellingRateBRL = rate.sellingRate
                ? Math.round(Number(rate.sellingRate) * fxRate * 100) / 100
                : undefined;

              return {
                rateKey: rate.rateKey,
                rateClass: rate.rateClass,
                rateType: rate.rateType,
                net: netBRL,
                sellingRate: sellingRateBRL,
                originalNet: rawNet,
                originalCurrency: rawCurrency,
                fxRate: fxRate,
                hotelMandatory: rate.hotelMandatory,
                allotted: rate.allotted,
                paymentType: rate.paymentType,
                boardCode: rate.boardCode,
                boardName: rate.boardName,
                packaging: rate.packaging === true,
                rateComments: rate.rateComments,
                supplierCancellationPolicies: (rate.cancellationPolicies || []).map((cp: any) => ({
                  amount: String(cp.amount ?? ""), from: cp.from,
                })),
                cancellationPolicies: (rate.cancellationPolicies || []).map((cp: any) => ({
                  amount: Math.round(Number(cp.amount || 0) * fxRate * 100) / 100,
                  from: cp.from,
                })),
              };
            }),
          };
        }),
      };
    });

    for (const hotel of mappedHotels) {
      for (const room of hotel.rooms) {
        for (const rate of room.rates) {
          const { offerToken: _token, ...quotedRate } = rate;
          rate.offerToken = signHotelbedsOffer({ checkIn: params.checkIn, checkOut: params.checkOut, occupancies,
            hotel: { code: hotel.code, name: hotel.name, address: hotel.address, categoryName: hotel.categoryName,
              destinationName: hotel.destinationName, originalCurrency: hotel.originalCurrency },
            room: { code: room.code, name: room.name }, rate: quotedRate });
        }
      }
    }

    return {
      ok: true,
      isSimulation: false,
      checkIn: data.hotels?.checkIn || params.checkIn,
      checkOut: data.hotels?.checkOut || params.checkOut,
      total: mappedHotels.length,
      contentIncomplete: (params.includeContent !== false && codes.some((code) => !contentMap[code])) ||
        Number(data.hotels?.total || 0) > mappedHotels.length,
      hotels: mappedHotels,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Hotelbeds] Exceção:", msg);
    return failure(msg);
  }
}

export interface HotelbedsPax {
  name: string;
  surname: string;
  type?: "AD" | "CH";
  age?: number;
}

/**
 * Validação de tarifa antes do fechamento (CheckRate)
 */
export async function checkHotelbedsRate(rateKey: string): Promise<{
  ok: boolean;
  rate?: any;
  error?: string;
}> {
  const cfg = getHotelbedsConfig();
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      rate: {
        rateKey,
        status: "CONFIRMED_AVAILABLE",
        net: 1650.0,
        currency: "BRL",
        isSimulation: true,
      },
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/checkrates`;

    const res = await fetchHotelbedsBooking(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify({
        language: "POR",
        rooms: [{ rateKey }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }

    const data = await res.json();
    return { ok: true, rate: data.hotel };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro no checkrates" };
  }
}

/**
 * Criação da Reserva confirmada na Hotelbeds (Timeout oficial >= 60s para certificação)
 */
export async function createHotelbedsBooking(booking: {
  rateKey: string;
  clientReference: string;
  holder: { name: string; surname: string };
  paxes: HotelbedsPax[];
  remark?: string;
}): Promise<{
  ok: boolean;
  isSimulation: boolean;
  bookingReference?: string;
  status?: string;
  supplierRemarks?: string;
  rawBooking?: any;
  error?: string;
}> {
  const cfg = getHotelbedsConfig();

  // Fallback simulado
  if (!cfg.apiKey || !cfg.secret) {
    const simRef = `HB-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      ok: true,
      isSimulation: true,
      bookingReference: simRef,
      status: "CONFIRMED",
      supplierRemarks: `Payable through Hotelbeds Incoming S.A.U., acting as agent for the service operating company. VAT: B-60292723. Reference: ${simRef}`,
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/bookings`;

    const body = {
      language: "POR",
      holder: booking.holder,
      rooms: [
        {
          rateKey: booking.rateKey,
          paxes: booking.paxes.map((p) => {
            const paxItem: Record<string, unknown> = {
              roomId: 1,
              type: p.type || "AD",
              name: p.name,
              surname: p.surname,
            };
            if (p.type === "CH" && typeof p.age === "number") {
              paxItem.age = p.age;
            }
            return paxItem;
          }),
        },
      ],
      clientReference: booking.clientReference,
      remark: booking.remark || "Reserva Hóspede Club",
      tolerance: 0,
    };

    // Certificação Hotelbeds: Timeout mínimo de 60 segundos
    const res = await fetchHotelbedsBooking(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        isSimulation: false,
        error: data.error?.message || `Erro Hotelbeds (${res.status})`,
      };
    }

    const hbRef = data.booking?.reference;
    if (!hbRef || data.booking?.status !== "CONFIRMED") {
      return { ok: false, isSimulation: false, error: "A Hotelbeds não confirmou a reserva." };
    }
    const supplier = readVoucherSupplier(data.booking);
    const supplierRemarks = supplier ? supplierVoucherNotice(supplier, hbRef) : undefined;

    return {
      ok: true,
      isSimulation: false,
      bookingReference: hbRef,
      status: data.booking?.status || "CONFIRMED",
      supplierRemarks,
      rawBooking: data.booking,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      isSimulation: false,
      error: err instanceof Error ? err.message : "Falha ao enviar reserva à Hotelbeds",
    };
  }
}

/**
 * Consulta de detalhes da reserva na Hotelbeds APItude (BookingDetail)
 * Endpoint: GET /hotel-api/1.0/bookings/{bookingReference}
 */
export async function getHotelbedsBookingDetail(bookingReference: string): Promise<{
  ok: boolean;
  isSimulation: boolean;
  booking?: any;
  error?: string;
}> {
  const cfg = getHotelbedsConfig();
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      isSimulation: true,
      booking: {
        reference: bookingReference,
        status: "CONFIRMED",
        isSimulation: true,
      },
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/bookings/${encodeURIComponent(bookingReference)}?language=POR`;

    const res = await fetchHotelbedsBooking(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        isSimulation: false,
        error: data.error?.message || `Erro ao consultar reserva (${res.status})`,
      };
    }

    return {
      ok: true,
      isSimulation: false,
      booking: data.booking,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      isSimulation: false,
      error: err instanceof Error ? err.message : "Falha ao consultar reserva na Hotelbeds",
    };
  }
}

/**
 * Cancelamento de Reserva na Hotelbeds APItude (BookingCancel)
 * Endpoint: DELETE /hotel-api/1.0/bookings/{bookingReference}?cancellationFlag=SIMULATION | CANCELLATION
 */
export async function cancelHotelbedsBooking(
  bookingReference: string,
  flag: "SIMULATION" | "CANCELLATION" = "CANCELLATION"
): Promise<{
  ok: boolean;
  isSimulation: boolean;
  cancellationAmount?: number;
  status?: string;
  booking?: any;
  error?: string;
}> {
  const cfg = getHotelbedsConfig();
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      isSimulation: true,
      cancellationAmount: 0,
      status: "CANCELLED",
      booking: {
        reference: bookingReference,
        status: "CANCELLED",
        isSimulation: true,
      },
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/bookings/${encodeURIComponent(
      bookingReference
    )}?cancellationFlag=${flag}`;

    const res = await fetchHotelbedsBooking(endpoint, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        isSimulation: false,
        error: data.error?.message || `Erro ao cancelar reserva (${res.status})`,
      };
    }

    return {
      ok: true,
      isSimulation: false,
      cancellationAmount: data.booking?.cancellationAmount,
      status: data.booking?.status || "CANCELLED",
      booking: data.booking,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      isSimulation: false,
      error: err instanceof Error ? err.message : "Falha ao processar cancelamento na Hotelbeds",
    };
  }
}
