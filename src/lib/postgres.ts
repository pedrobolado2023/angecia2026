/**
 * HÓSPEDE CLUB — Conexão com Banco de Dados PostgreSQL (Easypanel / Supabase / Neon / Render)
 * Salva com segurança:
 * - Cadastros completos de Membros/Clientes no CRM (Nome, CPF, WhatsApp, E-mail, Endereço, Código de Verificação)
 * - Dados completos do Titular e Segundo Hóspede em Reservas
 * - Dados de Pagamento do Mercado Pago e Emissão de Vouchers
 */

import { Pool } from "pg";
import { CustomerCRMRecord, hashPassword } from "./customerStore";

let pool: Pool | null = null;
let tablesInitialized = false;

/**
 * Higieniza a DATABASE_URL. Se a senha contiver caracteres especiais como '@',
 * codifica automaticamente para '%40' evitando que o parser quebre o hostname.
 * Exemplo: postgres://postgres:142635Pe@@agentesia_postgres:5432/agentesia
 *       -> postgres://postgres:142635Pe%40@agentesia_postgres:5432/agentesia
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  const pattern = /^(postgres(?:ql)?:\/\/[^:]+:)(.*)@([^@\/]+(?::\d+)?\/.*)$/;
  const match = trimmed.match(pattern);
  if (match) {
    const prefix = match[1];
    const rawPass = match[2];
    const suffix = match[3];
    if (rawPass.includes("@")) {
      return `${prefix}${rawPass.replace(/@/g, "%40")}@${suffix}`;
    }
  }
  return trimmed;
}

export function getPostgresPool(): Pool | null {
  const rawDbUrl = process.env.DATABASE_URL?.trim();
  if (!rawDbUrl) {
    return null;
  }

  const dbUrl = sanitizeDatabaseUrl(rawDbUrl);

  if (!pool) {
    const isCloud =
      dbUrl.includes("supabase") ||
      dbUrl.includes("render") ||
      dbUrl.includes("neon") ||
      dbUrl.includes("easypanel") ||
      dbUrl.includes("sslmode=require");

    pool = new Pool({
      connectionString: dbUrl,
      ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Error] Erro inesperado no pool de conexões:", err.message);
    });
  }

  return pool;
}

/**
 * Garante que as tabelas necessárias existam no PostgreSQL do Easypanel / Cloud
 */
export async function ensurePostgresTables(): Promise<boolean> {
  if (tablesInitialized) return true;
  const db = getPostgresPool();
  if (!db) return false;

  const initSql = `
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_code VARCHAR(30) UNIQUE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
      cpf VARCHAR(20),
      whatsapp VARCHAR(40) NOT NULL,
      birth_date DATE,
      cep VARCHAR(20),
      street VARCHAR(200),
      number VARCHAR(50),
      complement VARCHAR(100),
      neighborhood VARCHAR(100),
      city VARCHAR(100),
      state VARCHAR(20),
      verification_code VARCHAR(10),
      verified BOOLEAN DEFAULT FALSE,
      membership_status VARCHAR(50) DEFAULT 'TRIAL_ACTIVE',
      trial_expires_at TIMESTAMPTZ,
      password_hash VARCHAR(255),
      marketing_opt_in BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_active_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Migração segura de colunas caso a tabela já existisse com menos campos
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS street VARCHAR(200);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS number VARCHAR(50);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(20);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_status VARCHAR(50) DEFAULT 'TRIAL_ACTIVE';
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

    -- Garante que o administrador / membro Pedro Henrique Bonfim exista no PostgreSQL
    INSERT INTO customers (
      member_code, first_name, last_name, full_name, email,
      country, cpf, whatsapp,
      cep, street, number, neighborhood, city, state,
      verification_code, verified, membership_status, trial_expires_at,
      password_hash, marketing_opt_in, last_active_at
    ) VALUES (
      'MEM-359468', 'Pedro', 'Henrique Bonfim', 'Pedro Henrique Bonfim', 'pedrohenriquebonfim156@gmail.com',
      'Brasil', '12345678900', '5562993473656',
      '74000-000', 'Avenida Central', '100', 'Setor Bueno', 'Goiânia', 'GO',
      '359468', TRUE, 'TRIAL_ACTIVE', NOW() + INTERVAL '7 days',
      '11af28d43e170f80280ab3c087dbeddd88a17a94518735d97d26113a7f3d6397', TRUE, NOW()
    ) ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      verified = TRUE,
      membership_status = 'TRIAL_ACTIVE',
      last_active_at = NOW();

    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_code VARCHAR(50) UNIQUE NOT NULL,
      voucher_code VARCHAR(50) UNIQUE NOT NULL,
      hotel_id VARCHAR(120) NOT NULL,
      hotel_name VARCHAR(200) NOT NULL,
      room_id VARCHAR(120) NOT NULL,
      room_name VARCHAR(200) NOT NULL,
      check_in_date DATE NOT NULL,
      nights_count INT NOT NULL DEFAULT 1,
      guests_count INT NOT NULL DEFAULT 2,
      total_amount_brl NUMERIC(10, 2) NOT NULL,

      -- Titular
      primary_first_name VARCHAR(100) NOT NULL,
      primary_last_name VARCHAR(100) NOT NULL,
      primary_email VARCHAR(180) NOT NULL,
      primary_country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
      primary_cpf VARCHAR(20) NOT NULL,
      primary_whatsapp VARCHAR(40) NOT NULL,
      primary_birth_date DATE,

      -- Segundo Adulto
      second_guest_first_name VARCHAR(100),
      second_guest_last_name VARCHAR(100),
      second_guest_cpf VARCHAR(20),
      second_guest_birth_date DATE,

      -- Mercado Pago & Pagamento
      payment_method VARCHAR(20) NOT NULL,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      installments INT DEFAULT 1,
      mp_payment_id VARCHAR(100),
      mp_status VARCHAR(50),
      mp_qr_code TEXT,
      mp_qr_code_base64 TEXT,
      mp_ticket_url TEXT,

      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
    CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
    CREATE INDEX IF NOT EXISTS idx_bookings_voucher ON bookings(voucher_code);
    CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
  `;

  try {
    const client = await db.connect();
    try {
      await client.query(initSql);
      tablesInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[PostgreSQL] Aviso ao inicializar tabelas:", msg);
    return false;
  }
}

/**
 * Salva ou atualiza o cadastro de um Membro no PostgreSQL do Easypanel
 */
export async function saveCustomerToPostgres(
  customer: CustomerCRMRecord,
  verificationCode?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getPostgresPool();
  if (!db) {
    return { success: false, error: "DATABASE_URL não configurada no ambiente." };
  }

  try {
    await ensurePostgresTables();
    const client = await db.connect();

    try {
      const names = (customer.fullName || "").trim().split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "";
      const cleanEmail = customer.email.trim().toLowerCase();
      const cleanWhatsapp = customer.whatsapp.replace(/\D/g, "");
      const cleanCpf = (customer.cpf || "").replace(/\D/g, "");
      const memberCode = customer.id?.startsWith("MEM-")
        ? customer.id
        : `MEM-${(customer.id || String(Date.now())).slice(-6).toUpperCase()}`;
      const code = verificationCode || customer.verification?.code || null;
      const isVerified = customer.verification?.verified || false;
      const memStatus = customer.membership?.status || "TRIAL_ACTIVE";
      const trialExp = customer.membership?.trialExpiresAt ? new Date(customer.membership.trialExpiresAt) : null;

      const addr = customer.address || {
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      };

      const pwdHash = customer.passwordHash || null;

      const upsertSql = `
        INSERT INTO customers (
          member_code, first_name, last_name, full_name, email,
          country, cpf, whatsapp,
          cep, street, number, complement, neighborhood, city, state,
          verification_code, verified, membership_status, trial_expires_at,
          marketing_opt_in, password_hash, last_active_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          cpf = COALESCE(NULLIF(EXCLUDED.cpf, ''), customers.cpf),
          whatsapp = EXCLUDED.whatsapp,
          cep = COALESCE(NULLIF(EXCLUDED.cep, ''), customers.cep),
          street = COALESCE(NULLIF(EXCLUDED.street, ''), customers.street),
          number = COALESCE(NULLIF(EXCLUDED.number, ''), customers.number),
          complement = COALESCE(EXCLUDED.complement, customers.complement),
          neighborhood = COALESCE(NULLIF(EXCLUDED.neighborhood, ''), customers.neighborhood),
          city = COALESCE(NULLIF(EXCLUDED.city, ''), customers.city),
          state = COALESCE(NULLIF(EXCLUDED.state, ''), customers.state),
          verification_code = COALESCE(EXCLUDED.verification_code, customers.verification_code),
          verified = EXCLUDED.verified,
          membership_status = EXCLUDED.membership_status,
          trial_expires_at = COALESCE(EXCLUDED.trial_expires_at, customers.trial_expires_at),
          password_hash = COALESCE(EXCLUDED.password_hash, customers.password_hash),
          last_active_at = NOW();
      `;

      await client.query(upsertSql, [
        memberCode,
        firstName,
        lastName,
        customer.fullName.trim(),
        cleanEmail,
        "Brasil",
        cleanCpf,
        cleanWhatsapp,
        addr.cep || "",
        addr.street || "",
        addr.number || "",
        addr.complement || null,
        addr.neighborhood || "",
        addr.city || "",
        addr.state || "",
        code,
        isVerified,
        memStatus,
        trialExp,
        customer.marketingOptIn ?? true,
        pwdHash,
      ]);

      console.log(`[PostgreSQL CRM] Cliente '${cleanEmail}' persistido com sucesso no banco!`);
      return { success: true };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PostgreSQL CRM] Erro ao persistir cliente no banco:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Marca o cliente como verificado no PostgreSQL após informar o código correto
 */
export async function markCustomerVerifiedInPostgres(
  identifier: string
): Promise<{ success: boolean; error?: string }> {
  const db = getPostgresPool();
  if (!db) return { success: false, error: "DATABASE_URL ausente." };

  try {
    const client = await db.connect();
    try {
      const clean = identifier.trim().toLowerCase();
      const digits = identifier.replace(/\D/g, "");

      await client.query(
        `
        UPDATE customers
        SET verified = TRUE,
            membership_status = 'TRIAL_ACTIVE',
            last_active_at = NOW()
        WHERE email = $1 OR whatsapp = $2 OR cpf = $2;
      `,
        [clean, digits]
      );

      return { success: true };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Converte um registro do banco de dados PostgreSQL para a interface CustomerCRMRecord
 */
export function mapPostgresRowToCustomer(row: any): CustomerCRMRecord {
  const trialExpiresAt = row.trial_expires_at
    ? new Date(row.trial_expires_at).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const now = Date.now();
  const trialExpiresTime = new Date(trialExpiresAt).getTime();
  const diffMs = trialExpiresTime - now;
  const daysRemaining = diffMs > 0 ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;
  const status: "TRIAL_ACTIVE" | "EXPIRED" =
    diffMs > 0 ? ((row.membership_status as "TRIAL_ACTIVE" | "EXPIRED") || "TRIAL_ACTIVE") : "EXPIRED";

  return {
    id: row.member_code || String(row.id),
    fullName: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Membro Hóspede Club",
    email: (row.email || "").toLowerCase().trim(),
    whatsapp: row.whatsapp || "",
    cpf: row.cpf || undefined,
    address: {
      cep: row.cep || "",
      street: row.street || "",
      number: row.number || "",
      complement: row.complement || undefined,
      neighborhood: row.neighborhood || "",
      city: row.city || "",
      state: row.state || "",
    },
    passwordHash: row.password_hash || undefined,
    verification: {
      code: row.verification_code || "123456",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      verified: Boolean(row.verified),
      attempts: 0,
    },
    membership: {
      status,
      trialStartedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      trialExpiresAt,
      daysRemaining,
    },
    cityOrigin: row.city ? `${row.city} (${row.state || "BR"})` : "Brasil",
    preferredDestinations: ["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi"],
    travelProfile: "Casal",
    authMethod: "Cadastro Clube",
    marketingOptIn: Boolean(row.marketing_opt_in ?? true),
    lgpdConsentTimestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : new Date().toISOString(),
    favoriteHotelIds: [],
    favoriteHotelNames: [],
    searchHistory: [],
    viewedHotels: [],
    checkoutIntents: [],
    bookings: [],
    campaignTags: ["Membro Private Ativo", "PostgreSQL Oficial"],
  };
}

/**
 * Busca um cliente no PostgreSQL por E-mail, CPF, WhatsApp, member_code ou ID
 */
export async function findCustomerInPostgres(
  identifier: string
): Promise<CustomerCRMRecord | null> {
  const db = getPostgresPool();
  if (!db) return null;

  try {
    await ensurePostgresTables();
    const client = await db.connect();
    try {
      const clean = (identifier || "").trim().toLowerCase();
      const digits = (identifier || "").replace(/\D/g, "");

      const query = `
        SELECT * FROM customers
        WHERE LOWER(email) = $1
           OR ($2 <> '' AND (REPLACE(REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', ''), ' ', '') = $2 OR REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(whatsapp, ''), '+', ''), '(', ''), ')', ''), '-', '') = $2))
           OR member_code = $1
           OR id::text = $1
        LIMIT 1;
      `;
      const res = await client.query(query, [clean, digits]);
      if (res.rows.length === 0) return null;

      return mapPostgresRowToCustomer(res.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("[PostgreSQL CRM] Erro ao buscar cliente por identificador:", err);
    return null;
  }
}

/**
 * Autentica um cliente diretamente no banco PostgreSQL (por Senha ou Código)
 */
export async function authenticateCustomerInPostgres(
  identifier: string,
  secret: string,
  mode: "password" | "code" = "password"
): Promise<CustomerCRMRecord> {
  const customer = await findCustomerInPostgres(identifier);
  if (!customer) {
    throw new Error("Nenhum cadastro encontrado com este e-mail ou CPF no banco de dados.");
  }

  if (mode === "password") {
    const hashed = hashPassword(secret);
    if (customer.passwordHash && customer.passwordHash !== hashed) {
      throw new Error("Senha incorreta. Verifique os dados digitados.");
    }
  } else {
    if (!customer.verification || customer.verification.code !== secret.trim()) {
      throw new Error("Código de segurança inválido.");
    }
  }

  // Atualiza last_active_at no PostgreSQL
  try {
    const db = getPostgresPool();
    if (db) {
      await db.query("UPDATE customers SET last_active_at = NOW() WHERE email = $1", [customer.email]);
    }
  } catch {}

  return customer;
}

export interface SaveBookingRecordInput {
  bookingCode: string;
  voucherCode: string;
  hotelId: string;
  hotelName: string;
  roomId: string;
  roomName: string;
  checkInDate: string;
  nightsCount: number;
  guestsCount: number;
  totalAmountBRL: number;

  // Titular
  primaryFirstName: string;
  primaryLastName: string;
  primaryEmail: string;
  primaryCountry: string;
  primaryCpf: string;
  primaryWhatsapp: string;
  primaryBirthDate?: string;

  // Segundo Adulto
  secondGuestFirstName?: string;
  secondGuestLastName?: string;
  secondGuestCpf?: string;
  secondGuestBirthDate?: string;

  // Pagamento
  paymentMethod: "PIX" | "CREDIT_CARD";
  paymentStatus: "PENDING" | "APPROVED" | "REJECTED";
  installments?: number;
  mpPaymentId?: string;
  mpStatus?: string;
  mpQrCode?: string;
  mpQrCodeBase64?: string;
  mpTicketUrl?: string;
}

export async function saveBookingToPostgres(
  input: SaveBookingRecordInput
): Promise<{ success: boolean; error?: string }> {
  const db = getPostgresPool();
  if (!db) {
    return { success: false, error: "DATABASE_URL não configurada no ambiente." };
  }

  try {
    await ensurePostgresTables();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 1. Upsert do Cliente Titular
      const memberCode = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;
      const fullName = `${input.primaryFirstName.trim()} ${input.primaryLastName.trim()}`;
      const birthDate = input.primaryBirthDate ? input.primaryBirthDate : null;

      await client.query(
        `
        INSERT INTO customers (
          member_code, first_name, last_name, full_name, email,
          country, cpf, whatsapp, birth_date, last_active_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          full_name = EXCLUDED.full_name,
          country = EXCLUDED.country,
          cpf = EXCLUDED.cpf,
          whatsapp = EXCLUDED.whatsapp,
          birth_date = COALESCE(EXCLUDED.birth_date, customers.birth_date),
          last_active_at = NOW();
      `,
        [
          memberCode,
          input.primaryFirstName.trim(),
          input.primaryLastName.trim(),
          fullName,
          input.primaryEmail.trim().toLowerCase(),
          input.primaryCountry.trim() || "Brasil",
          input.primaryCpf.trim(),
          input.primaryWhatsapp.trim(),
          birthDate,
        ]
      );

      // 2. Insert da Reserva Completa
      const secondBirthDate = input.secondGuestBirthDate ? input.secondGuestBirthDate : null;

      await client.query(
        `
        INSERT INTO bookings (
          booking_code, voucher_code, hotel_id, hotel_name, room_id, room_name,
          check_in_date, nights_count, guests_count, total_amount_brl,
          primary_first_name, primary_last_name, primary_email, primary_country, primary_cpf, primary_whatsapp, primary_birth_date,
          second_guest_first_name, second_guest_last_name, second_guest_cpf, second_guest_birth_date,
          payment_method, payment_status, installments,
          mp_payment_id, mp_status, mp_qr_code, mp_qr_code_base64, mp_ticket_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24,
          $25, $26, $27, $28, $29
        );
      `,
        [
          input.bookingCode,
          input.voucherCode,
          input.hotelId,
          input.hotelName,
          input.roomId,
          input.roomName,
          input.checkInDate,
          input.nightsCount,
          input.guestsCount,
          input.totalAmountBRL,
          input.primaryFirstName.trim(),
          input.primaryLastName.trim(),
          input.primaryEmail.trim().toLowerCase(),
          input.primaryCountry.trim() || "Brasil",
          input.primaryCpf.trim(),
          input.primaryWhatsapp.trim(),
          birthDate,
          input.secondGuestFirstName?.trim() || null,
          input.secondGuestLastName?.trim() || null,
          input.secondGuestCpf?.trim() || null,
          secondBirthDate,
          input.paymentMethod,
          input.paymentStatus,
          input.installments || 1,
          input.mpPaymentId || null,
          input.mpStatus || null,
          input.mpQrCode || null,
          input.mpQrCodeBase64 || null,
          input.mpTicketUrl || null,
        ]
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PostgreSQL] Falha ao persistir reserva no banco:", msg);
    return { success: false, error: msg };
  }
}
