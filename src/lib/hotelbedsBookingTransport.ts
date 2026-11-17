import { request } from "node:https";
import { gunzip } from "node:zlib";
import { loadHotelbedsMtlsContext } from "./hotelbedsMtls.mjs";

type BookingRequest = {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  cache?: RequestCache;
};

let clientContext: ReturnType<typeof loadHotelbedsMtlsContext> | undefined;

export function hotelbedsBookingBaseUrl(environment: "test" | "production", fallback: string) {
  if (process.env.HOTELBEDS_MTLS_ENABLED !== "true") return fallback;
  return environment === "production" ? "https://api-mtls.hotelbeds.com" : "https://api-mtls.test.hotelbeds.com";
}

export async function fetchHotelbedsBooking(url: string, options: BookingRequest): Promise<Response> {
  if (process.env.HOTELBEDS_MTLS_ENABLED !== "true") return fetch(url, options);

  const endpoint = new URL(url);
  const environment = process.env.HOTELBEDS_ENVIRONMENT === "production" ? "production" : "test";
  if (endpoint.origin !== hotelbedsBookingBaseUrl(environment, "") || endpoint.username || endpoint.password ||
      !endpoint.pathname.startsWith("/hotel-api/1.0/")) {
    throw new Error("Endpoint mTLS de reservas da Hotelbeds inválido.");
  }

  clientContext ??= loadHotelbedsMtlsContext();
  const headers = new Headers(options.headers);
  headers.set("accept-encoding", "gzip");
  if (options.body !== undefined) headers.set("content-length", String(Buffer.byteLength(options.body)));
  const requestOptions = {
    method: options.method,
    headers: Object.fromEntries(headers),
    secureContext: clientContext,
    rejectUnauthorized: true,
    signal: options.signal ?? AbortSignal.timeout(15000),
  };

  return new Promise((resolve, reject) => {
    const call = request(endpoint, requestOptions, (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
      incoming.once("error", reject);
      incoming.once("end", () => {
        const status = incoming.statusCode;
        if (!status || status < 200 || status > 599) {
          reject(new Error("Status HTTP inválido da Hotelbeds."));
          return;
        }
        const body = Buffer.concat(chunks);
        const finish = (content: Buffer) => {
          resolve(new Response([204, 205, 304].includes(status) ? null : new Uint8Array(content), { status }));
        };
        if (body.length && incoming.headers["content-encoding"] === "gzip") {
          gunzip(body, (error, content) => error ? reject(error) : finish(content));
        } else {
          finish(body);
        }
      });
    });
    call.once("error", reject);
    call.end(options.body);
  });
}
