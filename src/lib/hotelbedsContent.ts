import { getHotelbedsConfig, generateHotelbedsSignature, type HotelbedsConfig } from "./hotelbedsConfig";
import type { HotelbedsContentData } from "./hotelbeds";
import { CATALOG_MAX_AGE_MS, catalogDatabase, hotelbedsCatalogScope, normalizeHotelCatalogText, readHotelCatalog, saveHotelCatalogBatch, searchStoredBrazilHotels } from "./hotelbedsCatalogStore";

export function normalizeHotelbedsContent(h: any): HotelbedsContentData {
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

  const facilityText = (f: any) => {
    const description = f.description?.content;
    if (!description) return "";
    const value = [f.number, f.timeFrom && `a partir de ${f.timeFrom}`, f.timeTo && `até ${f.timeTo}`]
      .filter((value) => value !== undefined && value !== null && value !== "").join(" · ");
    return `${description}${value ? `: ${value}` : ""}${f.indFee === true ? " (cobrado à parte)" : ""}`;
  };
  const facilities = (h.facilities || []).filter((f: any) => f.indYesOrNo !== false).map(facilityText).filter(Boolean);
  const remarks = [
    ...(h.facilities || []).filter((f: any) => f.voucher === true && f.indYesOrNo !== false)
      .map((f: any) => ({ text: facilityText(f) })),
    ...(h.issues || []).map((issue: any) => ({ text: issue.description?.content || issue.name?.content || "",
      from: issue.dateFrom, to: issue.dateTo })),
  ].filter((item) => item.text);

  return {
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
    remarks,
    roomImages,
    roomTypeImages,
    habImages,
  };
}


// Cache local de conteúdo; o PostgreSQL preserva os dados entre reinícios.
const contentCache = new Map<
  string,
  { timestamp: number; data: HotelbedsContentData }
>();
const INDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let nextContentRequest = 0;

function rememberContent(key: string, data: HotelbedsContentData, timestamp: number) {
  if (contentCache.size >= 2000 && !contentCache.has(key)) {
    const oldest = contentCache.keys().next().value;
    if (oldest !== undefined) contentCache.delete(oldest);
  }
  contentCache.set(key, { timestamp, data });
}

export async function fetchContentPage(url: string, cfg: HotelbedsConfig) {
  const now = Date.now();
  const start = Math.max(now, nextContentRequest);
  nextContentRequest = start + 400;
  if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
  const { signature } = generateHotelbedsSignature(cfg.apiKey, cfg.secret);
  const response = await fetch(url, {
    headers: { "Api-key": cfg.apiKey, "X-Signature": signature, Accept: "application/json", "Accept-Encoding": "gzip" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  return response;
}

type CatalogEntry = { code: number; name?: { content?: string }; city?: { content?: string } };
let brazilCatalog: { expires: number; entries: CatalogEntry[] } | undefined;
let pendingBrazilCatalog: Promise<CatalogEntry[]> | undefined;

export async function findBrazilHotelbedsCodes(query: string): Promise<number[]> {
  const config = getHotelbedsConfig();
  const stored = await searchStoredBrazilHotels(config, query).catch(() => null);
  if (stored !== null) return stored;
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
        brazilCatalog = { expires: Date.now() + INDEX_CACHE_TTL_MS, entries };
        return entries;
      })().finally(() => { pendingBrazilCatalog = undefined; });
    }
  }
  const entries = brazilCatalog && brazilCatalog.expires > Date.now()
    ? brazilCatalog.entries
    : await pendingBrazilCatalog!;
  const words = normalizeHotelCatalogText(query).trim().split(/\s+/).filter(Boolean);
  return [...new Set(entries.filter((entry) => {
    const text = normalizeHotelCatalogText(`${entry.name?.content || ""} ${entry.city?.content || ""}`);
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

  const result = await getCachedHotelbedsContent(codes);
  const missingCodes: (number | string)[] = [];
  const now = Date.now();
  const scope = hotelbedsCatalogScope(cfg);

  for (const c of codes) {
    const cached = contentCache.get(`${scope}:${c}`);
    if (!cached || now - cached.timestamp >= CATALOG_MAX_AGE_MS) {
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
        const url = `${contentBaseUrl}/hotel-content-api/1.0/hotels/${codesStr}/details?language=POR`;

        const res = await fetchContentPage(url, cfg);

        if (!res.ok) throw new Error(`Content API respondeu HTTP ${res.status}`);
        {
          const data = await res.json();
          const hotels = data.hotels || (data.hotel ? [data.hotel] : []);
          for (const h of hotels) {
            const contentItem = normalizeHotelbedsContent(h);
            rememberContent(`${scope}:${h.code}`, contentItem, now);
            result[h.code] = contentItem;
          }
          try {
            const db = await catalogDatabase();
            if (db) await saveHotelCatalogBatch(db, cfg, hotels);
          } catch {
            console.warn("[Hotelbeds Content API] Não foi possível persistir o conteúdo consultado.");
          }
        }
      } catch (err) {
        console.warn("[Hotelbeds Content API] Falha no chunk:", err);
      }
    }));
  }

  return result;
}

export async function getCachedHotelbedsContent(codes: (number | string)[]) {
  const config = getHotelbedsConfig();
  const scope = hotelbedsCatalogScope(config);
  const result: Record<string | number, HotelbedsContentData> = {};
  const persisted = await readHotelCatalog(config, codes).catch(() => []);
  for (const row of persisted) {
    const item = normalizeHotelbedsContent(row.content);
    rememberContent(`${scope}:${item.code}`, item, new Date(row.fetched_at).getTime());
  }
  for (const code of codes) {
    const item = contentCache.get(`${scope}:${code}`);
    if (item) result[code] = item.data;
  }
  return result;
}
