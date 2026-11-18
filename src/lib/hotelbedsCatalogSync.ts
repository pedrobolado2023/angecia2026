import { randomUUID } from "node:crypto";
import { catalogDatabase, hotelbedsCatalogScope, saveHotelCatalogBatch } from "./hotelbedsCatalogStore";
import { getHotelbedsConfig } from "./hotelbedsConfig";
import { fetchContentPage } from "./hotelbedsContent";

const PAGE_SIZE = 500;
const TICK_MS = 60000;
let timer: ReturnType<typeof setInterval> | undefined;

export function catalogSyncEnabled() {
  return process.env.HOTELBEDS_CATALOG_SYNC_ENABLED === "true" &&
    process.env.HOTELBEDS_ENVIRONMENT === "production";
}

export async function runHotelbedsCatalogStep() {
  const config = getHotelbedsConfig();
  if (!catalogSyncEnabled()) return { state: "disabled" };
  if (!config.apiKey || !config.secret) return { state: "unconfigured" };
  const db = await catalogDatabase();
  if (!db) return { state: "unconfigured" };
  const scope = hotelbedsCatalogScope(config);
  const client = await db.connect();
  const leaseToken = randomUUID();
  let locked = false;
  let transaction = false;
  try {
    await client.query("INSERT INTO hotelbeds_catalog_sync(scope) VALUES ($1) ON CONFLICT DO NOTHING", [scope]);
    const { rows: [job] } = await client.query(`UPDATE hotelbeds_catalog_sync
      SET lease_token = $2, lease_until = NOW() + INTERVAL '5 minutes'
      WHERE scope = $1 AND (lease_until IS NULL OR lease_until < NOW())
      RETURNING *, next_attempt_at <= NOW() AS retry_due, next_run_at <= NOW() AS run_due`, [scope, leaseToken]);
    locked = Boolean(job);
    if (!job) return { state: "busy" };
    if (!job.retry_due || (!job.run_id && !job.run_due)) return { state: "waiting" };

    const runId = job.run_id || randomUUID();
    if (!job.run_id) {
      await client.query(`UPDATE hotelbeds_catalog_sync SET run_id = $2, next_from = 1, total = NULL,
        started_at = NOW(), last_error = NULL, updated_at = NOW() WHERE scope = $1`, [scope, runId]);
    }
    const from = job.run_id ? job.next_from : 1;
    const url = new URL(`${config.baseUrl}/hotel-content-api/1.0/hotels`);
    url.search = new URLSearchParams({ countryCode: "BR", language: "POR", fields: "all",
      from: String(from), to: String(from + PAGE_SIZE - 1) }).toString();
    const response = await fetchContentPage(url.toString(), config);
    if (!response.ok) {
      await response.body?.cancel();
      const hours = [400, 401, 403, 404].includes(response.status) ? 24 : 0.25;
      const retryHeader = response.headers.get("retry-after");
      const retryAfter = retryHeader && !Number.isFinite(Number(retryHeader))
        ? (Date.parse(retryHeader) - Date.now()) / 1000 : Number(retryHeader);
      const delay = Math.max(hours * 3600, Number.isFinite(retryAfter) ? Math.min(retryAfter, 86400) : 0);
      await client.query(`UPDATE hotelbeds_catalog_sync SET last_error = $2,
        next_attempt_at = NOW() + ($3 * INTERVAL '1 second'), updated_at = NOW() WHERE scope = $1 AND lease_token = $4`,
        [scope, `HTTP ${response.status}`, delay, leaseToken]);
      return { state: "error", status: response.status };
    }

    const page = await response.json();
    if (!Number.isSafeInteger(page.total) || page.total < 0 || !Array.isArray(page.hotels) ||
        page.hotels.length !== Math.min(PAGE_SIZE, Math.max(0, page.total - from + 1)) ||
        page.hotels.some((hotel: any) => !Number.isSafeInteger(Number(hotel.code)) || Number(hotel.code) <= 0) ||
        new Set(page.hotels.map((hotel: any) => Number(hotel.code))).size !== page.hotels.length) {
      throw new Error("Resposta incompleta do catálogo.");
    }
    if (job.run_id && job.total !== null && job.total !== page.total) {
      await client.query(`UPDATE hotelbeds_catalog_sync SET run_id = NULL, next_from = 1, total = NULL,
        last_error = 'O catálogo mudou durante a leitura; a próxima etapa reinicia a paginação.',
        next_attempt_at = NOW() + INTERVAL '1 minute', updated_at = NOW() WHERE scope = $1 AND lease_token = $2`, [scope, leaseToken]);
      return { state: "restarting" };
    }

    await client.query("BEGIN");
    transaction = true;
    const current = await client.query(`SELECT scope FROM hotelbeds_catalog_sync
      WHERE scope = $1 AND lease_token = $2 AND lease_until > NOW() FOR UPDATE`, [scope, leaseToken]);
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      transaction = false;
      return { state: "busy" };
    }
    await saveHotelCatalogBatch(client, config, page.hotels, runId, "BR");
    const complete = from + page.hotels.length > page.total;
    if (complete) {
      const count = await client.query("SELECT COUNT(*)::int AS total FROM hotelbeds_catalog WHERE scope = $1 AND sync_run = $2", [scope, runId]);
      if (count.rows[0].total !== page.total) throw new Error("Cobertura incompleta do catálogo.");
      await client.query(`UPDATE hotelbeds_catalog SET active = false WHERE scope = $1 AND country_code = 'BR'
        AND sync_run IS DISTINCT FROM $2 AND fetched_at < (SELECT started_at FROM hotelbeds_catalog_sync WHERE scope = $1)`, [scope, runId]);
      await client.query(`UPDATE hotelbeds_catalog_sync SET run_id = NULL, next_from = 1, total = $2,
        completed_at = NOW(), next_run_at = started_at + INTERVAL '7 days', next_attempt_at = NOW(),
        last_error = NULL, updated_at = NOW() WHERE scope = $1`, [scope, page.total]);
    } else {
      await client.query(`UPDATE hotelbeds_catalog_sync SET next_from = $2, total = $3,
        next_attempt_at = NOW() + INTERVAL '1 minute', last_error = NULL, updated_at = NOW() WHERE scope = $1`,
        [scope, from + page.hotels.length, page.total]);
    }
    await client.query("COMMIT");
    transaction = false;
    return { state: complete ? "complete" : "running", processed: Math.min(from + page.hotels.length - 1, page.total), total: page.total };
  } catch (error) {
    if (transaction) await client.query("ROLLBACK");
    const restart = error instanceof Error && error.message === "Cobertura incompleta do catálogo.";
    if (locked) await client.query(`UPDATE hotelbeds_catalog_sync SET last_error = 'Falha ao processar a página do catálogo.',
      run_id = CASE WHEN $2 THEN NULL ELSE run_id END, next_from = CASE WHEN $2 THEN 1 ELSE next_from END,
      next_attempt_at = NOW() + INTERVAL '15 minutes', updated_at = NOW() WHERE scope = $1 AND lease_token = $3`, [scope, restart, leaseToken]);
    return { state: "error" };
  } finally {
    try {
      if (locked) await client.query(`UPDATE hotelbeds_catalog_sync SET lease_token = NULL, lease_until = NULL
        WHERE scope = $1 AND lease_token = $2`, [scope, leaseToken]);
    } finally {
      client.release();
    }
  }
}

export async function hotelbedsCatalogStatus() {
  const config = getHotelbedsConfig();
  const db = await catalogDatabase();
  if (!db) return { enabled: catalogSyncEnabled(), environment: config.environment, database: false };
  const scope = hotelbedsCatalogScope(config);
  const { rows: [job] } = await db.query(`SELECT next_from, total, started_at, completed_at,
    next_run_at, next_attempt_at, last_error, (run_id IS NOT NULL) AS running
    FROM hotelbeds_catalog_sync WHERE scope = $1`, [scope]);
  const { rows: [count] } = await db.query("SELECT COUNT(*)::int AS hotels FROM hotelbeds_catalog WHERE scope = $1 AND active", [scope]);
  return { enabled: catalogSyncEnabled(), environment: config.environment, database: true, hotels: count.hotels, sync: job || null };
}

export function startHotelbedsCatalogScheduler() {
  if (timer || !catalogSyncEnabled()) return;
  const tick = () => runHotelbedsCatalogStep().then((result) => {
    if (["running", "complete", "error", "restarting"].includes(result.state)) {
      console.info("[Hotelbeds Catálogo]", JSON.stringify(result));
    }
  }).catch(() => console.warn("[Hotelbeds Catálogo] Sincronização temporariamente indisponível."));
  timer = setInterval(() => { void tick(); }, TICK_MS);
  timer.unref();
  void tick();
}
