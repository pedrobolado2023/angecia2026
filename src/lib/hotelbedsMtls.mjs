import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSecureContext } from "node:tls";

export class HotelbedsMtlsConfigError extends Error {}

function createClientContext(cert, key, passphrase) {
  if (/-----BEGIN (?:NEW )?CERTIFICATE REQUEST-----/.test(key.toString())) {
    throw new HotelbedsMtlsConfigError("A chave configurada contém um CSR. Use a chave privada original que gerou o pedido de certificado.");
  }
  return createSecureContext({ cert, key, passphrase });
}

export function loadHotelbedsMtlsContext(env = process.env) {
  const certPem = env.HOTELBEDS_MTLS_CERT_PEM;
  const keyPem = env.HOTELBEDS_MTLS_KEY_PEM;
  const certPath = env.HOTELBEDS_MTLS_CERT_PATH;
  const keyPath = env.HOTELBEDS_MTLS_KEY_PATH;
  const passphrase = env.HOTELBEDS_MTLS_KEY_PASSWORD;

  if ((certPem && certPath) || (keyPem && keyPath)) {
    throw new HotelbedsMtlsConfigError("Escolha uma origem por arquivo: HOTELBEDS_MTLS_CERT_PEM ou HOTELBEDS_MTLS_CERT_PATH para o certificado, e HOTELBEDS_MTLS_KEY_PEM ou HOTELBEDS_MTLS_KEY_PATH para a chave.");
  }

  if (!certPem && !certPath) {
    throw new HotelbedsMtlsConfigError("Configure HOTELBEDS_MTLS_CERT_PEM ou HOTELBEDS_MTLS_CERT_PATH para o certificado.");
  }

  if (!keyPem && !keyPath) {
    throw new HotelbedsMtlsConfigError("Configure HOTELBEDS_MTLS_KEY_PATH com o caminho da chave privada original ou HOTELBEDS_MTLS_KEY_PEM com o conteúdo da chave.");
  }

  if (certPath && keyPath) {
    return createClientContext(readFileSync(/* turbopackIgnore: true */ certPath), readFileSync(/* turbopackIgnore: true */ keyPath), passphrase);
  }

  const directory = mkdtempSync(join(tmpdir(), "hotelbeds-mtls-"));
  try {
    const certFile = certPath || join(directory, "client.crt");
    const keyFile = keyPath || join(directory, "client.key");
    if (certPem) writeFileSync(certFile, certPem.replace(/\\r\\n|\\n/g, "\n"), { mode: 0o600, flag: "wx" });
    if (keyPem) writeFileSync(keyFile, keyPem.replace(/\\r\\n|\\n/g, "\n"), { mode: 0o600, flag: "wx" });
    return createClientContext(readFileSync(/* turbopackIgnore: true */ certFile), readFileSync(/* turbopackIgnore: true */ keyFile), passphrase);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
