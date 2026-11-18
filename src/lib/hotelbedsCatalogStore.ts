import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getPostgresPool } from "./postgres";
import type { HotelbedsConfig } from "./hotelbedsConfig";

export const CATALOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let schema: Promise<void> | undefined;

export function hotelbedsCatalogScope(config: HotelbedsConfig) {
  return createHash("sha256").update(JSON.stringify([config.environment, config.baseUrl, config.apiKey, "POR"])).digest("hex");
}

export const normalizeHotelCatalogText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export async function catalogDatabase() {
  const db = getPostgresPool();
  if (!db) return null;
  schema ??= db.query(`
    CREATE TABLE IF NOT EXISTS hotelbeds_catalog (
      scope TEXT NOT NULL,
      hotel_code BIGINT NOT NULL,
      country_code TEXT NOT NULL,
      search_text TEXT NOT NULL,
      content JSONB NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL,
      sync_run UUID,
      active BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY (scope, hotel_code)
    );
    CREATE INDEX IF NOT EXISTS hotelbeds_catalog_country ON hotelbeds_catalog(scope, country_code) WHERE active;
    CREATE TABLE IF NOT EXISTS hotelbeds_catalog_sync (
      scope TEXT PRIMARY KEY,
      run_id UUID,
      next_from INTEGER NOT NULL DEFAULT 1,
      total INTEGER,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      lease_token UUID,
      lease_until TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => undefined).catch((error) => { schema = undefined; throw error; });
  await schema;
  return db;
}

export async function saveHotelCatalogBatch(
  db: Pool | PoolClient, config: HotelbedsConfig, hotels: any[], runId?: string, country?: string,
) {
  const fetchedAt = new Date().toISOString();
  const rows = hotels.filter((hotel) => Number.isSafeInteger(Number(hotel.code)) && Number(hotel.code) > 0).map((hotel) => ({
    hotel_code: Number(hotel.code), country_code: hotel.countryCode || country || "",
    search_text: normalizeHotelCatalogText(`${hotel.name?.content || hotel.name || ""} ${hotel.city?.content || ""}`),
    content: hotel, fetched_at: fetchedAt, sync_run: runId || null,
  }));
  if (!rows.length) return;
  await db.query(`
    INSERT INTO hotelbeds_catalog(scope, hotel_code, country_code, search_text, content, fetched_at, sync_run)
    SELECT $1, h.hotel_code, h.country_code, h.search_text, h.content, h.fetched_at, h.sync_run
    FROM jsonb_to_recordset($2::jsonb) AS h(hotel_code BIGINT, country_code TEXT, search_text TEXT,
      content JSONB, fetched_at TIMESTAMPTZ, sync_run UUID)
    ON CONFLICT(scope, hotel_code) DO UPDATE SET country_code = EXCLUDED.country_code,
      search_text = EXCLUDED.search_text, content = EXCLUDED.content, fetched_at = EXCLUDED.fetched_at,
      sync_run = COALESCE(EXCLUDED.sync_run, hotelbeds_catalog.sync_run), active = true
    WHERE hotelbeds_catalog.fetched_at <= EXCLUDED.fetched_at`,
    [hotelbedsCatalogScope(config), JSON.stringify(rows)]);
}

export async function readHotelCatalog(config: HotelbedsConfig, codes: (string | number)[]) {
  const db = await catalogDatabase();
  const valid = [...new Set(codes.map(Number).filter((code) => Number.isSafeInteger(code) && code > 0))];
  if (!db || !valid.length) return [];
  const { rows } = await db.query<{ content: any; fetched_at: Date }>(
    "SELECT content, fetched_at FROM hotelbeds_catalog WHERE scope = $1 AND hotel_code = ANY($2::bigint[]) AND active",
    [hotelbedsCatalogScope(config), valid]);
  return rows;
}

export async function searchStoredBrazilHotels(config: HotelbedsConfig, query: string): Promise<number[] | null> {
  const db = await catalogDatabase();
  if (!db) return null;
  const scope = hotelbedsCatalogScope(config);
  const ready = await db.query("SELECT 1 FROM hotelbeds_catalog_sync WHERE scope = $1 AND completed_at IS NOT NULL", [scope]);
  if (!ready.rowCount) return null;
  const words = normalizeHotelCatalogText(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const patterns = words.map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`);
  const { rows } = await db.query<{ hotel_code: string }>(
    "SELECT hotel_code FROM hotelbeds_catalog WHERE scope = $1 AND country_code = 'BR' AND active AND search_text LIKE ALL($2::text[])",
    [scope, patterns]);
  return rows.map((row) => Number(row.hotel_code));
}
