import crypto from "crypto";
import { fetchLiveExchangeRates } from "./currency";
import { signHotelbedsOffer } from "./hotelbedsOffer";
import { fetchHotelbedsBooking, hotelbedsBookingBaseUrl } from "./hotelbedsBookingTransport";

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
export function translateHotelbedsRoomName(rawName: string): string {
  if (!rawName) return "Acomodação Selecionada";
  let name = rawName.trim();

  // Limpa sufixos redundantes de parênteses se houver
  name = name.replace(/\s*\([^)]*\)\s*/g, " ").trim();

  const rules: [RegExp, string][] = [
    [/\bDOUBLE\s+LUXURY\s+FRONT\s+OCEAN\b/gi, "Quarto Duplo Luxo Frente Mar"],
    [/\bLUXURY\s+DOUBLE\s+FRONT\s+OCEAN\b/gi, "Quarto Duplo Luxo Frente Mar"],
    [/\bDOUBLE\s+LUXURY\s+OCEAN\s+VIEW\b/gi, "Quarto Duplo Luxo Vista Mar"],
    [/\bDOUBLE\s+DELUXE\s+OCEAN\s+VIEW\b/gi, "Quarto Duplo Deluxe Vista Mar"],
    [/\bDOUBLE\s+DELUXE\s+SEA\s+VIEW\b/gi, "Quarto Duplo Deluxe Vista Mar"],
    [/\bSTANDARD\s+DOUBLE\b/gi, "Quarto Duplo Standard"],
    [/\bDOUBLE\s+STANDARD\b/gi, "Quarto Duplo Standard"],
    [/\bSUPERIOR\s+DOUBLE\b/gi, "Quarto Duplo Superior"],
    [/\bDOUBLE\s+SUPERIOR\b/gi, "Quarto Duplo Superior"],
    [/\bDOUBLE\s+LUXURY\b/gi, "Quarto Duplo Luxo"],
    [/\bLUXURY\s+DOUBLE\b/gi, "Quarto Duplo Luxo"],
    [/\bDOUBLE\s+DELUXE\b/gi, "Quarto Duplo Deluxe"],
    [/\bDELUXE\s+DOUBLE\b/gi, "Quarto Duplo Deluxe"],
    [/\bJUNIOR\s+SUITE\s+OCEAN\s+VIEW\b/gi, "Suíte Júnior Vista Mar"],
    [/\bJUNIOR\s+SUITE\b/gi, "Suíte Júnior"],
    [/\bMASTER\s+SUITE\s+OCEAN\s+VIEW\b/gi, "Suíte Master Vista Mar"],
    [/\bMASTER\s+SUITE\b/gi, "Suíte Master"],
    [/\bEXECUTIVE\s+SUITE\b/gi, "Suíte Executiva"],
    [/\bPRESIDENTIAL\s+SUITE\b/gi, "Suíte Presidencial"],
    [/\bTWIN\s+LUXURY\b/gi, "Quarto Twin Luxo"],
    [/\bLUXURY\s+TWIN\b/gi, "Quarto Twin Luxo"],
    [/\bTWIN\s+DELUXE\b/gi, "Quarto Twin Deluxe"],
    [/\bDELUXE\s+TWIN\b/gi, "Quarto Twin Deluxe"],
    [/\bTWIN\s+STANDARD\b/gi, "Quarto Twin Standard"],
    [/\bSTANDARD\s+TWIN\b/gi, "Quarto Twin Standard"],
    [/\bTRIPLE\s+DELUXE\b/gi, "Quarto Triplo Deluxe"],
    [/\bTRIPLE\s+STANDARD\b/gi, "Quarto Triplo Standard"],
    [/\bSINGLE\s+STANDARD\b/gi, "Quarto Individual Standard"],
    [/\bSINGLE\s+SUPERIOR\b/gi, "Quarto Individual Superior"],
    [/\bFRONT\s+OCEAN\b/gi, "Frente Mar"],
    [/\bOCEAN\s+VIEW\b/gi, "Vista Mar"],
    [/\bSEA\s+VIEW\b/gi, "Vista Mar"],
    [/\bCITY\s+VIEW\b/gi, "Vista Cidade"],
    [/\bGARDEN\s+VIEW\b/gi, "Vista Jardim"],
    [/\bMOUNTAIN\s+VIEW\b/gi, "Vista Montanha"],
    [/\bOCEAN\s+FRONT\b/gi, "Frente Mar"],
    [/\bDOUBLE\b/gi, "Quarto Duplo"],
    [/\bTWIN\b/gi, "Quarto Twin"],
    [/\bSINGLE\b/gi, "Quarto Individual"],
    [/\bTRIPLE\b/gi, "Quarto Triplo"],
    [/\bSUITE\b/gi, "Suíte"],
    [/\bDELUXE\b/gi, "Deluxe"],
    [/\bSTANDARD\b/gi, "Standard"],
    [/\bSUPERIOR\b/gi, "Superior"],
    [/\bEXECUTIVE\b/gi, "Executivo"],
    [/\bLUXURY\b/gi, "Luxo"],
    [/\bWITH\s+BALCONY\b/gi, "com Varanda"],
    [/\bBALCONY\b/gi, "Varanda"],
  ];

  for (const [pattern, replacement] of rules) {
    name = name.replace(pattern, replacement);
  }

  return name.replace(/\s+/g, " ").trim();
}

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

// Cache em memória do Content API com TTL de 24 horas
const contentCache = new Map<
  string | number,
  { timestamp: number; data: HotelbedsContentData }
>();
const CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let nextContentRequest = 0;

async function fetchContentPage(url: string, cfg: HotelbedsConfig) {
  for (let attempt = 0; ; attempt++) {
    const now = Date.now();
    const start = Math.max(now, nextContentRequest);
    nextContentRequest = start + 400;
    if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
    const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
    const response = await fetch(url, {
      headers: { "Api-key": cfg.apiKey, "X-Signature": signature, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (response.status !== 429 || attempt > 0) return response;
    const retryAfter = response.headers.get("retry-after");
    const seconds = retryAfter ? Number(retryAfter) : 1.5;
    if (!Number.isFinite(seconds) || seconds > 5) return response;
    await response.body?.cancel();
    nextContentRequest = Math.max(nextContentRequest, Date.now() + Math.max(seconds, 1) * 1000);
  }
}

type CatalogEntry = { code: number; name?: { content?: string }; city?: { content?: string } };
let brazilCatalog: { expires: number; entries: CatalogEntry[] } | undefined;
let pendingBrazilCatalog: Promise<CatalogEntry[]> | undefined;

const normalizeCatalogText = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export async function findBrazilHotelbedsCodes(query: string): Promise<number[]> {
  if (!brazilCatalog || brazilCatalog.expires <= Date.now()) {
    if (!pendingBrazilCatalog) {
      pendingBrazilCatalog = (async () => {
        const cfg = getHotelbedsConfig();
        if (!cfg.apiKey || !cfg.secret) throw new Error("Credenciais Hotelbeds não configuradas");
        const size = 1000;
        const getPage = async (from: number) => {
          const endpoint = `${cfg.baseUrl}/hotel-content-api/1.0/hotels?countryCode=BR&language=POR&fields=name,city&from=${from}&to=${from + size - 1}`;
          const response = await fetchContentPage(endpoint, cfg);
          if (!response.ok) throw new Error(`Catálogo Hotelbeds: HTTP ${response.status}`);
          const page = await response.json();
          if (!Number.isSafeInteger(page.total) || !Array.isArray(page.hotels)) {
            throw new Error("Resposta inválida do catálogo Hotelbeds");
          }
          return page as { total: number; hotels: CatalogEntry[] };
        };
        const first = await getPage(1);
        const entries = [...first.hotels];
        for (let from = size + 1; from <= first.total; from += size * 2) {
          const pages = await Promise.all(
            [from, from + size].filter((offset) => offset <= first.total).map(getPage)
          );
          entries.push(...pages.flatMap((page) => page.hotels));
        }
        if (new Set(entries.map((hotel) => hotel.code)).size < first.total) {
          throw new Error("O catálogo Hotelbeds retornou uma lista incompleta");
        }
        brazilCatalog = { expires: Date.now() + CONTENT_CACHE_TTL_MS, entries };
        return entries;
      })().finally(() => { pendingBrazilCatalog = undefined; });
    }
  }
  const entries = brazilCatalog && brazilCatalog.expires > Date.now()
    ? brazilCatalog.entries
    : await pendingBrazilCatalog!;
  const words = normalizeCatalogText(query).trim().split(/\s+/).filter(Boolean);
  return [...new Set(entries.filter((entry) => {
    const text = normalizeCatalogText(`${entry.name?.content || ""} ${entry.city?.content || ""}`);
    return words.length > 0 && words.every((word) => text.includes(word));
  }).map((entry) => entry.code))];
}

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
    const cached = contentCache.get(String(c));
    if (cached && now - cached.timestamp < CONTENT_CACHE_TTL_MS) {
      result[c] = cached.data;
    } else {
      missingCodes.push(c);
    }
  }

  if (missingCodes.length === 0) {
    return result;
  }

  // Agrupa códigos em lotes de até 35 para garantir confiabilidade e rapidez
  const CHUNK_SIZE = 35;
  const chunks: (number | string)[][] = [];
  for (let i = 0; i < missingCodes.length; i += CHUNK_SIZE) {
    chunks.push(missingCodes.slice(i, i + CHUNK_SIZE));
  }

  const contentBaseUrl = cfg.baseUrl.replace(/\/hotel-api\/.*$/, "");

  for (let offset = 0; offset < chunks.length; offset += 2) {
    await Promise.all(chunks.slice(offset, offset + 2).map(async (chunk) => {
      try {
        const codesStr = chunk.join(",");
        const url = `${contentBaseUrl}/hotel-content-api/1.0/hotels?codes=${codesStr}&language=POR&fields=all&from=1&to=${chunk.length}`;

        const res = await fetchContentPage(url, cfg);

        if (!res.ok) throw new Error(`Content API respondeu HTTP ${res.status}`);
        {
          const data = await res.json();
          const hotels = data.hotels || (data.hotel ? [data.hotel] : []);
          for (const h of hotels) {
            const rawImages = h.images || [];
            const genImages: string[] = [];
            const poolImages: string[] = [];
            const habImages: string[] = [];
            const allImages: string[] = [];
            const roomImages: Record<string, string[]> = {};
            const roomTypeImages: Record<string, string[]> = {};

            for (const img of rawImages) {
              if (!img.path) continue;
              // Limpa timestamps duplicados após '?' que alguns registros trazem
              const cleanPath = String(img.path).split("?")[0].trim();
              if (!/^[\w/-]+\.[a-z0-9]+$/i.test(cleanPath)) continue;
              const fullUrl = `https://photos.hotelbeds.com/giata/${cleanPath}`;
              allImages.push(fullUrl);

              if (img.imageTypeCode === "GEN") {
                genImages.push(fullUrl);
              } else if (img.imageTypeCode === "PIS") {
                poolImages.push(fullUrl);
              } else if (img.imageTypeCode === "HAB") {
                habImages.push(fullUrl);
              }

              if (img.roomCode) {
                if (!roomImages[img.roomCode]) {
                  roomImages[img.roomCode] = [];
                }
                roomImages[img.roomCode].push(fullUrl);
              }

              if (img.roomType) {
                const rt = String(img.roomType).toUpperCase();
                if (!roomTypeImages[rt]) {
                  roomTypeImages[rt] = [];
                }
                roomTypeImages[rt].push(fullUrl);
              }
            }

            // Hero image: Prioriza fachada real (GEN), depois piscina (PIS), depois fotos de acomodação (HAB), depois primeira disponível
            const heroImage = genImages[0] || poolImages[0] || habImages[0] || allImages[0] || undefined;
            // Galeria prioritária: Fachada -> Piscina -> Acomodações reais -> Demais fotos da propriedade
            const sortedGallery = Array.from(new Set([...genImages, ...poolImages, ...habImages, ...allImages])).slice(0, 12);

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
              heroImage,
              gallery: sortedGallery,
              facilities,
              roomImages,
              roomTypeImages,
              habImages,
            };

            contentCache.set(String(h.code), { timestamp: now, data: contentItem });
            result[h.code] = contentItem;
          }
        }
      } catch (err) {
        console.warn("[Hotelbeds Content API] Falha no chunk:", err);
      }
    }));
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
      params.includeContent === false ? Promise.resolve(Object.fromEntries(codes.flatMap((code) => {
        const cached = contentCache.get(String(code));
        return cached && Date.now() - cached.timestamp < CONTENT_CACHE_TTL_MS ? [[code, cached.data]] : [];
      })) as Record<number, HotelbedsContentData>) : fetchHotelbedsContent(codes),
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
    const supplier = data.booking?.supplier;
    const supplierRemarks = typeof supplier?.name === "string" && typeof supplier?.vatNumber === "string"
      ? `Payable through ${supplier.name}, acting as agent for the service operating company, details of which can be provided upon request. VAT: ${supplier.vatNumber} Reference: ${hbRef}`
      : typeof supplier?.remarks === "string" ? supplier.remarks : undefined;

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
    const endpoint = `${hotelbedsBookingBaseUrl(cfg.environment, cfg.baseUrl)}/hotel-api/1.0/bookings/${encodeURIComponent(bookingReference)}`;

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
