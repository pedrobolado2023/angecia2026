const action = process.argv[2] || "status";
const token = process.env.HOSPEDE_ADMIN_SESSION_SECRET || process.env.VANTAGGI_ADMIN_SESSION_SECRET || process.env.VELLUTO_ADMIN_SESSION_SECRET;
const port = Number(process.env.PORT || "3000");

try {
  if (!["status", "step"].includes(action) || !token || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Use status ou step e configure a variável de sessão administrativa do serviço web.");
  }
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/hotelbeds/catalog`, {
    method: action === "step" ? "POST" : "GET",
    headers: { "x-hospede-admin-token": token },
    redirect: "error",
    signal: AbortSignal.timeout(45000),
  });
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok || result.state === "error") process.exitCode = 1;
} catch (error) {
  console.error(error.message === "Use status ou step e configure a variável de sessão administrativa do serviço web."
    ? error.message : "Não foi possível consultar o serviço local do catálogo.");
  process.exitCode = 1;
}
