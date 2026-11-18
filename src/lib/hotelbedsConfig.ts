import crypto from "node:crypto";

export interface HotelbedsConfig {
  apiKey: string;
  secret: string;
  environment: "test" | "production";
  baseUrl: string;
}

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
