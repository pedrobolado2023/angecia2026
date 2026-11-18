// Diagnóstico de leitura: não imprime URL, usuário, senha, certificados ou dados de clientes.
import pg from "pg";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL não está configurada neste serviço.");
  process.exitCode = 1;
} else {
  const pool = new pg.Pool({ connectionString: raw, max: 1, connectionTimeoutMillis: 7000,
    statement_timeout: 7000, query_timeout: 8000, application_name: "hospede-security-check" });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN READ ONLY");
    const role = (await client.query(`SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
      FROM pg_roles WHERE rolname = current_user`)).rows[0];
    const settings = (await client.query(`SELECT current_setting('server_version') AS version,
      current_setting('ssl') AS server_tls, current_setting('password_encryption') AS password_encryption,
      current_setting('listen_addresses') AS listen_addresses,
      current_setting('transaction_read_only') AS read_only`)).rows[0];
    const ssl = (await client.query("SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid()")).rows[0];
    let rules = "Não consultado: exige privilégio administrativo; não conceder só para este teste.";
    if (role?.rolsuper) {
      rules = (await client.query(`SELECT
        COUNT(*) FILTER (WHERE type <> 'local' AND auth_method = 'trust')::int AS remote_trust_rules,
        COUNT(*) FILTER (WHERE address IN ('0.0.0.0', '::', 'all') AND (netmask IN ('0.0.0.0', '::') OR netmask IS NULL))::int AS all_addresses_rules,
        COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS invalid_rules
        FROM pg_hba_file_rules`)).rows[0];
    }
    console.log(JSON.stringify({ postgres: settings, applicationRolePrivileges: role,
      applicationConnectionTls: ssl || { ssl: false }, authenticationRules: rules,
      note: "Portas públicas, firewall e restauração de backups precisam de verificação na VPS." }, null, 2));
    await client.query("ROLLBACK");
  } catch (error) {
    console.error("Não foi possível concluir o diagnóstico. Código:", /^[A-Z0-9_]{1,40}$/.test(error.code || "") ? error.code : "CONNECTION_OR_QUERY_ERROR");
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}
