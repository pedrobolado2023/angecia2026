import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "./postgres";
import { getServerOmnibeesConfig } from "./serverEnv";

const duration = 8 * 60 * 60;
const windowSeconds = 15 * 60;
let schema: Promise<void> | undefined;
const cookieName = () => process.env.NODE_ENV === "production" ? "__Host-hospede_admin_session" : "hospede_admin_session_v2";
const sessionSecret = () => getServerOmnibeesConfig().adminSessionSecret || process.env.CUSTOMER_SESSION_SECRET || "";
export const adminHeaders = { "Cache-Control": "private, no-store" };

export function constantTimeEqual(actual: string, expected: string) {
  const left = createHmac("sha256", "hospede-admin-comparison").update(actual).digest();
  const right = createHmac("sha256", "hospede-admin-comparison").update(expected).digest();
  return Boolean(expected) && timingSafeEqual(left, right);
}

function digest(value: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Administração indisponível.");
  return createHmac("sha256", secret).update(`admin-v2:${value}`).digest("hex");
}

async function database() {
  const db = getPostgresPool();
  if (!db || !sessionSecret()) throw new Error("Administração indisponível.");
  schema ??= db.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_digest TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).then(() => undefined).catch((error) => { schema = undefined; throw error; });
  await schema;
  return db;
}

export function sameOriginAdminRequest(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const raw = request.headers.get("origin");
  if (!raw) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const origin = new URL(raw);
    if (origin.username || origin.password || (process.env.NODE_ENV === "production" && origin.protocol !== "https:")) return false;
    // Host é o destino recebido pelo proxy; não confiar em X-Forwarded-Host arbitrário.
    return origin.origin === request.nextUrl.origin || origin.host === request.headers.get("host");
  } catch { return false; }
}

function machineAuthenticated(request: NextRequest) {
  const token = request.headers.get("x-hospede-admin-token") || request.headers.get("x-velluto-admin-token") || "";
  return token.length <= 1024 && constantTimeEqual(token, getServerOmnibeesConfig().adminSessionSecret);
}

export async function authenticatedAdmin(request: NextRequest, options: { mutation?: boolean; allowMachine?: boolean } = {}) {
  const machine = options.allowMachine === true && machineAuthenticated(request);
  if (options.mutation && !sameOriginAdminRequest(request) && !(machine && !request.headers.has("origin"))) return false;
  if (machine) return true;
  const token = request.cookies.get(cookieName())?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const db = await database();
    const result = await db.query("SELECT 1 FROM admin_sessions WHERE token_digest=$1 AND expires_at > NOW()", [digest(token)]);
    return Boolean(result.rowCount);
  } catch { return false; }
}

export async function allowAdminLoginAttempt(request: NextRequest) {
  const db = await database();
  // Os hashes evitam registrar o endereço IP diretamente. O limite global impede contornar tudo trocando o header de IP.
  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 128);
  for (const [bucket, limit] of [["global", 100], [digest(`ip:${ip}`), 10]] as const) {
    const result = await db.query(`INSERT INTO admin_login_attempts(bucket, attempts, window_at) VALUES ($1,1,NOW())
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN admin_login_attempts.window_at > NOW() - INTERVAL '15 minutes'
          THEN LEAST(admin_login_attempts.attempts + 1, 1000000) ELSE 1 END,
        window_at = CASE WHEN admin_login_attempts.window_at > NOW() - INTERVAL '15 minutes'
          THEN admin_login_attempts.window_at ELSE NOW() END
      RETURNING attempts`, [bucket]);
    if (Number(result.rows[0]?.attempts) > limit) return false;
  }
  return true;
}

function clearOldCookies(response: NextResponse) {
  for (const name of ["hospede_admin_session", "velluto_admin_session"]) response.cookies.set(name, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0,
  });
}

export async function setAdminSession(request: NextRequest, response: NextResponse) {
  const db = await database();
  const previous = request.cookies.get(cookieName())?.value;
  if (previous && /^[a-f0-9]{64}$/.test(previous)) await db.query("DELETE FROM admin_sessions WHERE token_digest=$1", [digest(previous)]);
  const token = randomBytes(32).toString("hex");
  await db.query("INSERT INTO admin_sessions(token_digest, expires_at) VALUES ($1, NOW() + INTERVAL '8 hours')", [digest(token)]);
  await db.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
  await db.query("DELETE FROM admin_login_attempts WHERE window_at < NOW() - INTERVAL '1 day'");
  response.cookies.set(cookieName(), token, { httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: duration });
  clearOldCookies(response);
}

export async function clearAdminSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(cookieName())?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const db = await database();
    await db.query("DELETE FROM admin_sessions WHERE token_digest=$1", [digest(token)]);
  }
  response.cookies.set(cookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: 0 });
  clearOldCookies(response);
}

export const adminRetryAfter = String(windowSeconds);
