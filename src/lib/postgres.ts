/**
 * HÓSPEDE CLUB — Conexão com Banco de Dados PostgreSQL (Easypanel / Supabase / Neon / Render)
 * Salva com segurança:
 * - Dados completos do Titular (Nome, Sobrenome, E-mail, País, CPF, WhatsApp, Data de Nascimento)
 * - Dados do Segundo Adulto (Nome, Sobrenome, CPF, Data de Nascimento)
 * - Dados da Reserva e Pagamento Mercado Pago
 */

import { Pool } from "pg";

let pool: Pool | null = null;
let tablesInitialized = false;

export function getPostgresPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return null;
  }

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
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
      cpf VARCHAR(20) NOT NULL,
      whatsapp VARCHAR(40) NOT NULL,
      birth_date DATE,
      marketing_opt_in BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_active_at TIMESTAMPTZ DEFAULT NOW()
    );

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

