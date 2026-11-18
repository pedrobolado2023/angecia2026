import { createHmac, timingSafeEqual } from "node:crypto";
import type { HotelbedsHotelResult, HotelbedsOccupancy, HotelbedsRate } from "./hotelbeds";

type Offer = {
  expires: number;
  environment: string;
  checkIn: string;
  checkOut: string;
  occupancies: HotelbedsOccupancy[];
  hotel: Pick<HotelbedsHotelResult, "code" | "name" | "address" | "categoryName" | "destinationName" | "originalCurrency">;
  room: { code: string; name: string };
  rate: HotelbedsRate;
};

function secret() {
  const key = process.env.CUSTOMER_SESSION_SECRET;
  if (!key || key.length < 32) throw new Error("Cotação temporariamente indisponível.");
  return key;
}

export function signHotelbedsOffer(offer: Omit<Offer, "expires" | "environment">) {
  const payload = Buffer.from(JSON.stringify({ ...offer, expires: Date.now() + 20 * 60 * 1000,
    environment: process.env.HOTELBEDS_ENVIRONMENT || "test" })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(`hotelbeds-offer:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function readHotelbedsOffer(token: unknown): Offer | null {
  if (typeof token !== "string" || token.length > 100000) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = createHmac("sha256", secret()).update(`hotelbeds-offer:${parts[0]}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(parts[1], "base64url"))) return null;
  try {
    const offer: Offer = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return offer.expires > Date.now() && offer.environment === (process.env.HOTELBEDS_ENVIRONMENT || "test") ? offer : null;
  } catch {
    return null;
  }
}
