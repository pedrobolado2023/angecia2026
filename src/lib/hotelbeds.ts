import crypto from "crypto";

export interface HotelbedsConfig {
  apiKey: string;
  secret: string;
  environment: "test" | "production";
  baseUrl: string;
}

export interface HotelbedsOccupancy {
  rooms: number;
  adults: number;
  children?: number;
}

export interface HotelbedsStay {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface HotelbedsRate {
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
  cancellationPolicies?: Array<{
    amount: number;
    from: string;
  }>;
}

export interface HotelbedsRoom {
  code: string;
  name: string;
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
}

export interface HotelbedsHotelResult {
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
export function getHotelbedsConfig(): HotelbedsConfig {
  const apiKey = process.env.HOTELBEDS_API_KEY || "";
  const secret = process.env.HOTELBEDS_SECRET || "";
  const environment =
    process.env.HOTELBEDS_ENVIRONMENT === "production" ? "production" : "test";
  const defaultBaseUrl =
    environment === "production"
      ? "https://api.hotelbeds.com"
      : "https://api.test.hotelbeds.com";
  const baseUrl = process.env.HOTELBEDS_ENDPOINT_URL || defaultBaseUrl;

  return {
    apiKey,
    secret,
    environment,
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

/**
 * Gera a assinatura criptográfica obrigatória do Hotelbeds:
 * SHA256(apiKey + secret + timestampEmSegundos)
 */
export function generateHotelbedsSignature(
  apiKey: string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const raw = `${apiKey}${secret}${ts}`;
  const signature = crypto.createHash("sha256").update(raw).digest("hex");
  return { signature, timestamp: ts };
}

/**
 * Mascara a chave para exibição segura sem vazamento
 */
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

  // Se não houver credenciais configuradas, retorna modo simulação
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      isSimulation: true,
      environment: cfg.environment,
      baseUrl: cfg.baseUrl,
      apiKeyMasked: "Modo Simulação Ativo (Insira HOTELBEDS_API_KEY)",
      latencyMs: 15,
      status: "SIMULATED_READY",
      message:
        "Hotelbeds APItude operando em modo simulação. Adicione HOTELBEDS_API_KEY e HOTELBEDS_SECRET no Easypanel/.env.local para consultar os hotéis reais.",
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${cfg.baseUrl}/hotel-api/1.0/status`;

    const res = await fetch(endpoint, {
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
        baseUrl: cfg.baseUrl,
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
      baseUrl: cfg.baseUrl,
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
      baseUrl: cfg.baseUrl,
      apiKeyMasked: maskHotelbedsKey(cfg.apiKey),
      latencyMs: Math.round(performance.now() - start),
      status: "NETWORK_ERROR",
      message: `Erro ao conectar na Hotelbeds: ${msg}`,
    };
  }
}

// Cache em memória do Content API com TTL de 24 horas
const contentCache = new Map<
  string | number,
  { timestamp: number; data: HotelbedsContentData }
>();
const CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Consulta fotos reais (CDN GIATA), descrições em português e facilidades na Hotelbeds Content API
 */
export async function fetchHotelbedsContent(
  codes: (number | string)[]
): Promise<Record<string | number, HotelbedsContentData>> {
  if (!codes || codes.length === 0) return {};

  const cfg = getHotelbedsConfig();
  if (!cfg.apiKey || !cfg.secret) return {};

  const result: Record<string | number, HotelbedsContentData> = {};
  const missingCodes: (number | string)[] = [];
  const now = Date.now();

  for (const c of codes) {
    const cached = contentCache.get(c);
    if (cached && now - cached.timestamp < CONTENT_CACHE_TTL_MS) {
      result[c] = cached.data;
    } else {
      missingCodes.push(c);
    }
  }

  if (missingCodes.length === 0) {
    return result;
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    // Agrupa códigos em lotes de até 50 por chamada
    const codesStr = missingCodes.slice(0, 50).join(",");
    const contentBaseUrl = cfg.baseUrl.replace(/\/hotel-api\/.*$/, "");
    const url = `${contentBaseUrl}/hotel-content-api/1.0/hotels?codes=${codesStr}&language=POR&fields=all`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const hotels = data.hotels || (data.hotel ? [data.hotel] : []);
      for (const h of hotels) {
        const images = (h.images || []).map(
          (img: any) => `https://photos.hotelbeds.com/giata/bigger/${img.path}`
        );
        const facilities = (h.facilities || [])
          .map((f: any) => f.description?.content)
          .filter(Boolean)
          .slice(0, 10);

        const contentItem: HotelbedsContentData = {
          code: h.code,
          name: h.name?.content || h.name,
          description: h.description?.content,
          address: h.address?.content,
          city: h.city?.content,
          postalCode: h.postalCode,
          coordinates: h.coordinates,
          heroImage: images[0] || undefined,
          gallery: images.slice(0, 8),
          facilities,
        };

        contentCache.set(h.code, { timestamp: now, data: contentItem });
        result[h.code] = contentItem;
      }
    }
  } catch (err) {
    console.warn("[Hotelbeds Content API] Falha silenciosa:", err);
  }

  return result;
}

/**
 * Consulta disponibilidade de hotéis na Hotelbeds
 */
export async function searchHotelbedsAvailability(params: {
  checkIn: string;
  checkOut: string;
  occupancies?: HotelbedsOccupancy[];
  destinationCode?: string;
  hotelCodes?: (number | string)[];
}): Promise<HotelbedsAvailabilityResponse> {
  const cfg = getHotelbedsConfig();
  const occupancies = params.occupancies || [{ rooms: 1, adults: 2, children: 0 }];

  // Fallback simulado quando as chaves ainda não foram preenchidas no .env
  if (!cfg.apiKey || !cfg.secret) {
    return getSimulatedHotelbedsAvailability(params.checkIn, params.checkOut);
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${cfg.baseUrl}/hotel-api/1.0/hotels`;

    const requestPayload: Record<string, unknown> = {
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

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Hotelbeds] Erro na busca de disponibilidade (${res.status}):`, errText);
      // Retorna fallback simulado elegante para não deixar o usuário sem resposta
      const fallback = getSimulatedHotelbedsAvailability(params.checkIn, params.checkOut);
      fallback.rawError = `Hotelbeds retornou HTTP ${res.status}: ${errText}`;
      return fallback;
    }

    const data = await res.json();
    const hotelsList = data.hotels?.hotels || [];

    // Hidrata em lote as fotos oficiais do CDN GIATA, descrições e comodidades
    const codes = hotelsList.map((h: any) => h.code);
    let contentMap: Record<string | number, HotelbedsContentData> = {};
    try {
      if (codes.length > 0) {
        contentMap = await fetchHotelbedsContent(codes);
      }
    } catch (e) {
      console.warn("[Hotelbeds] Falha ao hidratar Content API:", e);
    }

    const mappedHotels: HotelbedsHotelResult[] = hotelsList.map((h: any) => {
      const content = contentMap[h.code];
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
        minRate: Number(h.minRate || 0),
        maxRate: Number(h.maxRate || 0),
        currency: h.currency || "BRL",
        heroImage: content?.heroImage,
        gallery: content?.gallery || [],
        description: content?.description,
        address: content?.address,
        postalCode: content?.postalCode,
        facilities: content?.facilities || [],
        rooms: (h.rooms || []).map((r: any) => ({
          code: r.code,
          name: r.name,
          rates: (r.rates || []).map((rate: any) => ({
            rateKey: rate.rateKey,
            rateClass: rate.rateClass,
            rateType: rate.rateType,
            net: Number(rate.net || 0),
            sellingRate: rate.sellingRate ? Number(rate.sellingRate) : undefined,
            hotelMandatory: rate.hotelMandatory,
            allotted: rate.allotted,
            paymentType: rate.paymentType,
            boardCode: rate.boardCode,
            boardName: rate.boardName,
            cancellationPolicies: rate.cancellationPolicies,
          })),
        })),
      };
    });

    return {
      ok: true,
      isSimulation: false,
      checkIn: data.hotels?.checkIn || params.checkIn,
      checkOut: data.hotels?.checkOut || params.checkOut,
      total: data.hotels?.total || mappedHotels.length,
      hotels: mappedHotels,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Hotelbeds] Exceção:", msg);
    const fallback = getSimulatedHotelbedsAvailability(params.checkIn, params.checkOut);
    fallback.rawError = msg;
    return fallback;
  }
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
    const endpoint = `${cfg.baseUrl}/hotel-api/1.0/checkrates`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify({
        rooms: [{ rateKey }],
      }),
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
 * Criação da Reserva confirmada na Hotelbeds
 */
export async function createHotelbedsBooking(booking: {
  rateKey: string;
  clientReference: string;
  holder: { name: string; surname: string };
  paxes: Array<{ name: string; surname: string; type?: "AD" | "CH" }>;
  remark?: string;
}): Promise<{
  ok: boolean;
  isSimulation: boolean;
  bookingReference?: string;
  status?: string;
  error?: string;
}> {
  const cfg = getHotelbedsConfig();

  // Fallback simulado
  if (!cfg.apiKey || !cfg.secret) {
    return {
      ok: true,
      isSimulation: true,
      bookingReference: `HB-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "CONFIRMED",
    };
  }

  try {
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const endpoint = `${cfg.baseUrl}/hotel-api/1.0/bookings`;

    const body = {
      holder: booking.holder,
      rooms: [
        {
          rateKey: booking.rateKey,
          paxes: booking.paxes.map((p, idx) => ({
            roomId: 1,
            type: p.type || "AD",
            name: p.name,
            surname: p.surname,
          })),
        },
      ],
      clientReference: booking.clientReference,
      remark: booking.remark || "Reserva Hóspede Club",
      tolerance: 2.0,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Api-key": cfg.apiKey,
        "X-Signature": signature,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        isSimulation: false,
        error: data.error?.message || `Erro Hotelbeds (${res.status})`,
      };
    }

    return {
      ok: true,
      isSimulation: false,
      bookingReference: data.booking?.reference,
      status: data.booking?.status || "CONFIRMED",
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
 * Dados simulados com estrutura idêntica à da Hotelbeds APItude
 */
function getSimulatedHotelbedsAvailability(
  checkIn: string,
  checkOut: string
): HotelbedsAvailabilityResponse {
  return {
    ok: true,
    isSimulation: true,
    message:
      "Dados simulados de hotéis brasileiros no formato oficial Hotelbeds APItude (Hotels & Rates). Configure HOTELBEDS_API_KEY no .env para dados ao vivo.",
    checkIn,
    checkOut,
    total: 3,
    hotels: [
      {
        code: 1067,
        name: "Palácio Atlântico & Spa",
        categoryCode: "5EST",
        categoryName: "5 STARS LUXURY",
        destinationCode: "RIO",
        destinationName: "Rio de Janeiro",
        zoneCode: 1,
        zoneName: "São Conrado",
        latitude: "-22.9982",
        longitude: "-43.2689",
        minRate: 1630.0,
        maxRate: 2400.0,
        currency: "BRL",
        rooms: [
          {
            code: "SUI.DLX",
            name: "Suíte Deluxe Frente Mar",
            rates: [
              {
                rateKey: `HB-${Date.now()}-SUI-01`,
                rateClass: "NOR",
                rateType: "BOOKABLE",
                net: 1630.0,
                sellingRate: 2400.0,
                allotted: 3,
                paymentType: "AT_WEB",
                boardCode: "BB",
                boardName: "Café da Manhã Incluso",
                cancellationPolicies: [
                  {
                    amount: 0,
                    from: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        code: 2044,
        name: "Reserva dos Corais Resort",
        categoryCode: "5EST",
        categoryName: "5 STARS RESORT",
        destinationCode: "MCZ",
        destinationName: "Maceió & Maragogi",
        zoneCode: 4,
        zoneName: "Praia de Antunes",
        latitude: "-9.0122",
        longitude: "-35.2133",
        minRate: 2150.0,
        maxRate: 3290.0,
        currency: "BRL",
        rooms: [
          {
            code: "BGL.PL",
            name: "Bangalô Coral com Piscina Privativa",
            rates: [
              {
                rateKey: `HB-${Date.now()}-BGL-02`,
                rateClass: "NOR",
                rateType: "BOOKABLE",
                net: 2150.0,
                sellingRate: 3290.0,
                allotted: 2,
                paymentType: "AT_WEB",
                boardCode: "AI",
                boardName: "All Inclusive",
              },
            ],
          },
        ],
      },
      {
        code: 3088,
        name: "Refúgio das Araucárias Boutique Hotel",
        categoryCode: "5EST",
        categoryName: "BOUTIQUE LUXURY",
        destinationCode: "GRAM",
        destinationName: "Gramado & Canela",
        zoneCode: 2,
        zoneName: "Vale do Quilombo",
        latitude: "-29.3789",
        longitude: "-50.8712",
        minRate: 1480.0,
        maxRate: 2190.0,
        currency: "BRL",
        rooms: [
          {
            code: "CHL.PRM",
            name: "Chalé Suíço com Lareira e Hidromassagem",
            rates: [
              {
                rateKey: `HB-${Date.now()}-CHL-03`,
                rateClass: "NOR",
                rateType: "BOOKABLE",
                net: 1480.0,
                sellingRate: 2190.0,
                allotted: 4,
                paymentType: "AT_WEB",
                boardCode: "BB",
                boardName: "Café da Manhã Colonial Incluso",
              },
            ],
          },
        ],
      },
    ],
  };
}

