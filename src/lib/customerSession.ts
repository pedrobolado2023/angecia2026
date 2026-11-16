import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionProfile, type CustomerCRMRecord } from "./customerStore";
import { findCustomerInPostgres, getPostgresPool } from "./postgres";

const cookieName = "hospede_customer_session";
const lifetime = 60 * 60 * 24 * 30;

function sessionSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  return secret && Buffer.byteLength(secret) >= 32 ? secret : null;
}

export function customerSessionConfigured() {
  return Boolean(sessionSecret()) && (process.env.NODE_ENV !== "production" || Boolean(process.env.DATABASE_URL));
}

export function setCustomerSession(response: NextResponse, customer: CustomerCRMRecord) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Sessões de clientes não configuradas.");
  const payload = Buffer.from(JSON.stringify({
    id: customer.id, email: customer.email.toLowerCase(), version: customer.sessionVersion ?? 0,
    exp: Math.floor(Date.now() / 1000) + lifetime,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  response.cookies.set(cookieName, `${payload}.${signature}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: lifetime,
  });
}

export async function authenticatedCustomer(request: NextRequest) {
  const secret = sessionSecret();
  const token = request.cookies.get(cookieName)?.value;
  if (!secret || !token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const { id, email, exp, version = 0 } = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (typeof id !== "string" || typeof email !== "string" || !Number.isInteger(version) ||
        !Number.isInteger(exp) || exp <= Date.now() / 1000) return null;
    const db = getPostgresPool();
    const customer = db ? await findCustomerInPostgres(email) :
      process.env.NODE_ENV === "production" ? null : getCustomerSessionProfile(id);
    return customer?.id === id && customer.email.toLowerCase() === email &&
      (customer.sessionVersion ?? 0) === version && customer.verification?.verified ? customer : null;
  } catch {
    return null;
  }
}

export function publicCustomer(customer: CustomerCRMRecord) {
  const { id, fullName, email, whatsapp, cpf, address, membership } = customer;
  return { id, fullName, email, whatsapp, cpf, address, membership };
}
