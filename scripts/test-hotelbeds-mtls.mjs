import { createHash } from "node:crypto";
import { get } from "node:https";
import { gunzipSync } from "node:zlib";
import { HotelbedsMtlsConfigError, loadHotelbedsMtlsContext } from "../src/lib/hotelbedsMtls.mjs";

try {
  const { HOTELBEDS_API_KEY: apiKey, HOTELBEDS_SECRET: secret } = process.env;
  if (process.env.HOTELBEDS_ENVIRONMENT !== "test" || !apiKey || !secret) {
    throw new HotelbedsMtlsConfigError("Defina HOTELBEDS_ENVIRONMENT=test, HOTELBEDS_API_KEY e HOTELBEDS_SECRET. Para carregar .env.local, use node --env-file=.env.local scripts/test-hotelbeds-mtls.mjs.");
  }

  const secureContext = loadHotelbedsMtlsContext();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");

  const result = await new Promise((resolve, reject) => {
    const request = get("https://api-mtls.test.hotelbeds.com/hotel-api/1.0/status", {
      secureContext,
      rejectUnauthorized: true,
      signal: AbortSignal.timeout(15000),
      headers: {
        "Api-key": apiKey,
        "X-Signature": signature,
        Accept: "application/json",
        "Accept-Encoding": "gzip",
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => {
        resolve({ status: response.statusCode, encoding: response.headers["content-encoding"], body: Buffer.concat(chunks) });
      });
    });
    request.on("error", reject);
  });

  const body = result.encoding === "gzip" ? gunzipSync(result.body) : result.body;
  const safeBody = [apiKey, secret, signature, process.env.HOTELBEDS_MTLS_KEY_PASSWORD]
    .filter(Boolean)
    .reduce((output, value) => output.replaceAll(value, "[REDACTED]"), body.toString("utf8"));
  console.log(`HTTP ${result.status}\n${safeBody}`);
  if (result.status !== 200) process.exitCode = 1;
} catch (error) {
  const reason = error instanceof HotelbedsMtlsConfigError
    ? error.message
    : error.code || "confira a configuração e o par certificado/chave";
  console.error(`Falha no teste mTLS da Hotelbeds. ${reason}`);
  process.exitCode = 1;
}
