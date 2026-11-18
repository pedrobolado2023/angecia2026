import { fetchContentPage } from "./hotelbedsContent";
import { getHotelbedsConfig } from "./hotelbedsConfig";
import { catalogDatabase, CATALOG_MAX_AGE_MS, hotelbedsCatalogScope } from "./hotelbedsCatalogStore";

const memory = new Map<string, { text: string; expires: number }>();
const pending = new Map<string, Promise<string>>();
let schema: Promise<void> | undefined;

export function parseRateCommentDetails(data: unknown, checkIn: string): string {
  const comments = (data as { rateComments?: unknown })?.rateComments;
  if (!Array.isArray(comments)) throw new Error("Resposta inválida das condições da tarifa.");
  return [...new Set(comments.filter((item) => (!item.dateStart || item.dateStart <= checkIn) &&
    (!item.dateEnd || item.dateEnd >= checkIn)).map((item) =>
      typeof item.description === "string" ? item.description : item.description?.content)
    .filter((text): text is string => typeof text === "string" && text.trim().length > 0))].join("\n");
}

// Consulta apenas a tarifa escolhida, sem repetir disponibilidade ou CheckRate.
export async function resolveHotelbedsRateComments(code: string, checkIn: string): Promise<string> {
  if (!/^\d+\|\d+\|\d+$/.test(code) || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
    throw new Error("Identificação inválida das condições da tarifa.");
  }
  const config = getHotelbedsConfig();
  const scope = hotelbedsCatalogScope(config);
  const key = `${scope}:${code}:${checkIn}`;
  const cached = memory.get(key);
  if (cached && cached.expires > Date.now()) return cached.text;
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    let db = await catalogDatabase().catch(() => null);
    try { if (db) {
      schema ??= db.query(`CREATE TABLE IF NOT EXISTS hotelbeds_rate_comments (
        scope TEXT NOT NULL, code TEXT NOT NULL, check_in DATE NOT NULL,
        description TEXT NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (scope, code, check_in))`).then(() => undefined).catch((error) => { schema = undefined; throw error; });
      await schema;
      const row = await db.query(`SELECT description FROM hotelbeds_rate_comments
        WHERE scope=$1 AND code=$2 AND check_in=$3 AND fetched_at > NOW() - INTERVAL '7 days'`, [scope, code, checkIn]);
      if (row.rows[0]) return row.rows[0].description as string;
    } } catch {
      console.warn("[Hotelbeds] Cache persistente de condições indisponível; consultando o fornecedor.");
      db = null;
    }
    const params = new URLSearchParams({ code, date: checkIn, fields: "all", language: "POR", useSecondaryLanguage: "True", from: "1", to: "100" });
    const contentBase = config.baseUrl.replace(/\/hotel-api\/.*$/, "");
    const response = await fetchContentPage(`${contentBase}/hotel-content-api/1.0/types/ratecommentdetails?${params}`, config);
    if (!response.ok) throw new Error(`Condições da tarifa indisponíveis (HTTP ${response.status}).`);
    const description = parseRateCommentDetails(await response.json(), checkIn);
    if (db) await db.query(`INSERT INTO hotelbeds_rate_comments (scope, code, check_in, description)
      VALUES ($1,$2,$3,$4) ON CONFLICT (scope,code,check_in)
      DO UPDATE SET description=EXCLUDED.description, fetched_at=NOW()`, [scope, code, checkIn, description])
      .catch(() => console.warn("[Hotelbeds] Não foi possível persistir as condições consultadas."));
    return description;
  })().then((text) => {
    if (memory.size >= 1000) memory.delete(memory.keys().next().value!);
    memory.set(key, { text, expires: Date.now() + CATALOG_MAX_AGE_MS });
    return text;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
