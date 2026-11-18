// PostgreSQL descartável em memória. Não lê .env nem acessa banco/provedores reais.
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const { loader } = require("./test-hotelbeds-certification.cjs");
const { NextRequest } = require("next/server");

async function main() {
  const pglitePath = process.env.PGLITE_TEST_MODULE || require.resolve("@electric-sql/pglite", {
    paths: [path.join(os.tmpdir(), "hospede-security-test")],
  });
  const { PGlite } = require(pglitePath);
  const engine = new PGlite();
  await engine.waitReady;
  process.env.NODE_ENV = "production";
  process.env.CUSTOMER_SESSION_SECRET = "fixture-customer-secret-".repeat(3);
  global.fetch = async () => { throw new Error("Rede externa bloqueada neste teste"); };
  let offline = false;
  const database = { query: async (sql, params) => {
    if (offline) throw new Error("Banco isolado indisponível");
    if (!params && sql.includes("CREATE TABLE")) { await engine.exec(sql); return { rows: [], rowCount: 0 }; }
    const result = await engine.query(sql, params);
    return { rows: result.rows, rowCount: /^\s*SELECT/i.test(sql) ? result.rows.length : result.affectedRows ?? result.rows.length };
  }};
  const config = { adminPasscode: "fixture-admin-pass", adminSessionSecret: "fixture-admin-secret-".repeat(3) };
  const serverEnv = { getServerOmnibeesConfig: () => config, getMaskedEnvStatusForAdmin: () => ({}) };
  let campaigns = 0;
  let catalogSteps = 0;
  const mocks = { "./postgres": { getPostgresPool: () => database }, "./serverEnv": serverEnv,
    "@/lib/serverEnv": serverEnv,
    "@/lib/customerSession": { authenticatedCustomer: async () => null },
    "@/lib/customerStore": { readCRMDatabase: () => ({ customers: [{ id: "fixture-member", passwordHash: "never-return",
      verification: { verified: true, code: "never-return" }, marketingOptIn: true, checkoutIntents: [], bookings: [] }], campaigns: [] }),
      createCampaignBroadcast: () => { campaigns++; return {}; } },
    "@/lib/hotelbedsCatalogSync": { hotelbedsCatalogStatus: async () => ({ ok: true }),
      runHotelbedsCatalogStep: async () => { catalogSteps++; return { ok: true }; } },
  };
  const load = loader(mocks);
  const admin = load("src/lib/adminSession.ts");
  const auth = load("src/app/api/admin/auth/route.ts");
  const cookieName = "__Host-hospede_admin_session";
  const req = ({ method = "GET", cookie, origin, passcode, ip = "198.51.100.10", headers = {}, url = "/api/admin/auth", body } = {}) => new NextRequest(`https://hospede.test${url}`, {
    method, headers: { host: "hospede.test", "x-real-ip": ip,
      ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}), ...headers },
    ...(method === "POST" ? { body: JSON.stringify(body ?? { passcode }) } : {}),
  });
  const login = (options = {}) => auth.POST(req({ method: "POST", origin: "https://hospede.test", passcode: config.adminPasscode, ...options }));
  try {
    assert(admin.sameOriginAdminRequest(new NextRequest("http://localhost:3000/api/admin/auth", {
      headers: { host: "hospede.test", origin: "https://hospede.test" },
    })), "Origem HTTPS deve funcionar atrás do proxy interno do Easypanel");
    assert.equal(admin.sameOriginAdminRequest(req({ origin: "https://attacker.invalid" })), false);
    assert.equal(admin.sameOriginAdminRequest(req({ origin: "http://hospede.test" })), false);
    assert.equal((await login({ origin: "https://attacker.invalid" })).status, 403);
    assert.equal((await login({ passcode: "x".repeat(5000), ip: "198.51.100.11" })).status, 413);
    const response = await login();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const cookie = response.cookies.get(cookieName);
    assert(cookie?.httpOnly && cookie.secure && cookie.sameSite === "strict");
    assert.equal(cookie.maxAge, 8 * 60 * 60);
    const token = cookie.value;
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(token, config.adminSessionSecret);
    assert.equal(response.cookies.get("hospede_admin_session").maxAge, 0);
    assert.equal((await engine.query("SELECT token_digest FROM admin_sessions")).rows[0].token_digest === token, false);
    const validCookie = `${cookieName}=${token}`;
    assert.equal((await (await auth.GET(req({ cookie: validCookie }))).json()).authenticated, true);
    assert.equal(await admin.authenticatedAdmin(req({ cookie: `hospede_admin_session=${config.adminSessionSecret}` })), false);
    assert.equal(await admin.authenticatedAdmin(req({ cookie: `${cookieName}=${"0".repeat(64)}` })), false);
    const customers = load("src/app/api/customers/route.ts");
    assert.equal((await customers.GET(req())).status, 401);
    const crm = await customers.GET(req({ cookie: validCookie }));
    assert.equal(crm.status, 200);
    assert(!(await crm.text()).includes("never-return"));
    assert.equal(await admin.authenticatedAdmin(req({ method: "POST", cookie: validCookie, origin: "https://attacker.invalid" }), { mutation: true }), false);
    const secondInstance = loader(mocks)("src/lib/adminSession.ts");
    assert.equal(await secondInstance.authenticatedAdmin(req({ cookie: validCookie })), true);
    await engine.query("UPDATE admin_sessions SET expires_at=NOW()-INTERVAL '1 minute'");
    assert.equal(await secondInstance.authenticatedAdmin(req({ cookie: validCookie })), false);
    const next = await login();
    const nextCookie = `${cookieName}=${next.cookies.get(cookieName).value}`;
    assert.equal((await auth.DELETE(req({ method: "DELETE", cookie: nextCookie, origin: "https://attacker.invalid" }))).status, 403);
    assert.equal((await auth.DELETE(req({ method: "DELETE", cookie: nextCookie, origin: "https://hospede.test" }))).status, 200);
    assert.equal(await secondInstance.authenticatedAdmin(req({ cookie: nextCookie })), false, "Logout deve revogar no banco");
    const attempts = await Promise.all(Array.from({ length: 11 }, () => login({ passcode: "wrong", ip: "198.51.100.20" })));
    assert.equal(attempts.filter((item) => item.status === 401).length, 10);
    assert.equal(attempts.filter((item) => item.status === 429).length, 1);
    assert.equal(attempts.find((item) => item.status === 429).headers.get("retry-after"), "900");
    assert.equal((await loader(mocks)("src/app/api/admin/auth/route.ts").POST(req({ method: "POST", origin: "https://hospede.test", passcode: "wrong", ip: "198.51.100.20" }))).status, 429);
    await engine.query("UPDATE admin_login_attempts SET window_at=NOW()-INTERVAL '16 minutes'");
    assert.equal((await login({ passcode: "wrong", ip: "198.51.100.20" })).status, 401);
    await engine.query("UPDATE admin_login_attempts SET attempts=100 WHERE bucket='global'");
    assert.equal((await login({ ip: "198.51.100.99" })).status, 429, "Limite global não depende do endereço informado");
    const machineHeaders = { "x-hospede-admin-token": config.adminSessionSecret };
    const catalog = load("src/app/api/admin/hotelbeds/catalog/route.ts");
    assert.equal((await catalog.GET(req({ headers: machineHeaders }))).status, 200);
    assert.equal((await catalog.POST(req({ method: "POST", headers: machineHeaders }))).status, 200);
    assert.equal(catalogSteps, 1);
    assert.equal((await catalog.POST(req({ method: "POST", headers: machineHeaders, origin: "https://attacker.invalid" }))).status, 401);
    assert.equal(catalogSteps, 1);
    const activity = load("src/app/api/customers/activity/route.ts");
    assert.equal((await activity.POST(req({ method: "POST", origin: "https://hospede.test",
      cookie: `hospede_admin_session=${config.adminSessionSecret}`, body: { activityType: "CREATE_CAMPAIGN" } }))).status, 401);
    assert.equal(campaigns, 0);
    offline = true;
    assert.equal((await login()).status, 503);
    assert.equal(await admin.authenticatedAdmin(req({ cookie: validCookie })), false);
    offline = false;
    config.adminSessionSecret = "";
    await engine.query("UPDATE admin_login_attempts SET window_at=NOW()-INTERVAL '16 minutes'");
    assert.equal((await login()).status, 200, "Compatibilidade com CUSTOMER_SESSION_SECRET existente");

    const pure = loader();
    const { computeMembershipStatus } = pure("src/lib/customerStore.ts");
    const { mapPostgresRowToCustomer } = pure("src/lib/postgres.ts");
    for (const status of ["EXPIRED", "TRIAL_ACTIVE", "ACTIVE_BY_BOOKING", "SUBSCRIBED"]) {
      const old = { createdAt: "2020-01-01T00:00:00.000Z", membership: { status, subscriptionPlan: { active: true, priceBRL: 19.9 } } };
      assert.equal(computeMembershipStatus(old).status, "MEMBER");
      assert.equal(computeMembershipStatus(old).subscriptionPlan, undefined);
      assert.equal(mapPostgresRowToCustomer({ id: "fixture", membership_status: status,
        trial_expires_at: "2020-01-01", verified: true }).membership.status, "MEMBER");
    }
    assert.equal(mapPostgresRowToCustomer({ id: "unverified", verified: false }).verification.verified, false,
      "Membro gratuito não dispensa a confirmação de WhatsApp");
    assert.equal((await pure("src/app/api/membership/subscribe/route.ts").POST()).status, 410);
    console.log("OK: membro gratuito, assinatura removida, sessão administrativa opaca/expirada/revogada, CSRF, limites concorrentes e persistidos, catálogo e sigilo do CRM.");
  } finally { await engine.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
