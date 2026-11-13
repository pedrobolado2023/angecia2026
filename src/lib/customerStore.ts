import fs from "fs";
import path from "path";
import crypto from "crypto";

if (typeof window !== "undefined") {
  throw new Error(
    "[SEGURANÇA HÓSPEDE CLUB] customerStore.ts é exclusivo do Backend (Node.js)."
  );
}

export interface CustomerAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CustomerVerification {
  code: string;
  expiresAt: string;
  verified: boolean;
  attempts: number;
}

export interface CustomerMembership {
  status: "TRIAL_ACTIVE" | "EXPIRED" | "ACTIVE_BY_BOOKING" | "SUBSCRIBED";
  trialStartedAt: string;
  trialExpiresAt: string;
  daysRemaining: number;
  subscriptionPlan?: {
    active: boolean;
    priceBRL: number;
    billingCycle: "monthly";
    nextBillingAt?: string;
    paymentMethod?: "PIX" | "CARD";
  };
}

export interface CustomerSearchEvent {
  query: string;
  destinationName: string;
  checkInDate: string;
  nights: number;
  guests: number;
  timestamp: string;
}

export interface CustomerViewedHotelEvent {
  hotelId: string;
  hotelName: string;
  cityName: string;
  stateCode: string;
  timestamp: string;
}

export interface CustomerCheckoutIntentEvent {
  hotelId: string;
  hotelName: string;
  roomName: string;
  paymentMethod: "PIX" | "CARD";
  estimatedTotal: number;
  nights: number;
  checkInDate: string;
  converted: boolean;
  timestamp: string;
}

export interface CustomerBookingRecord {
  bookingId: string;
  voucherCode: string;
  hotelId: string;
  hotelName: string;
  roomName: string;
  checkInDate: string;
  nights: number;
  guests: number;
  paymentMethod: "PIX" | "CARD";
  totalPaid: number;
  cashbackEarned: number;
  createdAt: string;
}

export interface CustomerCRMRecord {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  cpf?: string;
  address?: CustomerAddress;
  passwordHash?: string;
  verification?: CustomerVerification;
  membership?: CustomerMembership;
  cityOrigin: string;
  preferredDestinations: string[];
  travelProfile: "Casal" | "Família" | "Villas & Grupos";
  authMethod: "Cadastro Clube" | "WhatsApp VIP" | "Google" | "Apple" | "Checkout Direto";
  marketingOptIn: boolean;
  lgpdConsentTimestamp: string;
  createdAt: string;
  lastActiveAt: string;
  favoriteHotelIds: string[];
  favoriteHotelNames: string[];
  searchHistory: CustomerSearchEvent[];
  viewedHotels: CustomerViewedHotelEvent[];
  checkoutIntents: CustomerCheckoutIntentEvent[];
  bookings: CustomerBookingRecord[];
  campaignTags: string[];
}

export interface CampaignBroadcastRecord {
  id: string;
  title: string;
  channel: "WhatsApp VIP" | "E-mail Editorial" | "Push + WhatsApp";
  segmentFilter: string;
  discountOffer: string;
  destinationFocus: string;
  messageTemplate: string;
  recipientsCount: number;
  createdAt: string;
}

interface CRMDatabaseSchema {
  customers: CustomerCRMRecord[];
  campaigns: CampaignBroadcastRecord[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIR, "customers_crm.json");

/**
 * Utilitários criptográficos de senha e código de segurança
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(`${password}:hospede_club_salt_2026`)
    .digest("hex");
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function sanitizeCpf(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function sanitizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/**
 * Calcula o status real do Membro com base nos 7 dias de degustação (trial),
 * histórico de reservas pagas e plano mensal assinado.
 */
export function computeMembershipStatus(customer: CustomerCRMRecord): CustomerMembership {
  const now = Date.now();
  const subPlan = customer.membership?.subscriptionPlan;

  // 1. Assinatura ativa de R$ 19,90/mês
  if (subPlan && subPlan.active) {
    return {
      status: "SUBSCRIBED",
      trialStartedAt: customer.membership?.trialStartedAt || customer.createdAt,
      trialExpiresAt: customer.membership?.trialExpiresAt || customer.createdAt,
      daysRemaining: 30,
      subscriptionPlan: subPlan,
    };
  }

  // 2. Membro com reserva ativa nos últimos 45 dias
  if (customer.bookings && customer.bookings.length > 0) {
    const lastBooking = customer.bookings[0];
    const bookingTime = new Date(lastBooking.createdAt).getTime();
    if (now - bookingTime < 45 * 24 * 60 * 60 * 1000) {
      return {
        status: "ACTIVE_BY_BOOKING",
        trialStartedAt: customer.membership?.trialStartedAt || customer.createdAt,
        trialExpiresAt: customer.membership?.trialExpiresAt || customer.createdAt,
        daysRemaining: Math.max(1, Math.ceil((bookingTime + 45 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24))),
        subscriptionPlan: subPlan,
      };
    }
  }

  // 3. Degustação de 7 dias (Trial)
  const trialExpiresTime = customer.membership?.trialExpiresAt
    ? new Date(customer.membership.trialExpiresAt).getTime()
    : new Date(customer.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000;

  const diffMs = trialExpiresTime - now;

  if (diffMs > 0) {
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      status: "TRIAL_ACTIVE",
      trialStartedAt: customer.membership?.trialStartedAt || customer.createdAt,
      trialExpiresAt: new Date(trialExpiresTime).toISOString(),
      daysRemaining,
      subscriptionPlan: subPlan,
    };
  }

  // 4. Período expirado
  return {
    status: "EXPIRED",
    trialStartedAt: customer.membership?.trialStartedAt || customer.createdAt,
    trialExpiresAt: new Date(trialExpiresTime).toISOString(),
    daysRemaining: 0,
    subscriptionPlan: subPlan,
  };
}

const INITIAL_SEED_CUSTOMERS: CustomerCRMRecord[] = [
  {
    id: "MEM-359468",
    fullName: "Pedro Henrique Bonfim",
    email: "pedrohenriquebonfim156@gmail.com",
    whatsapp: "+55 (62) 99347-3656",
    cpf: "123.456.789-00",
    address: {
      cep: "74000-000",
      street: "Avenida Central",
      number: "100",
      complement: "Sala VIP",
      neighborhood: "Setor Bueno",
      city: "Goiânia",
      state: "GO",
    },
    passwordHash: hashPassword("35946800Pedro@"),
    verification: {
      code: "359468",
      expiresAt: "2027-01-01T00:00:00.000Z",
      verified: true,
      attempts: 0,
    },
    membership: {
      status: "TRIAL_ACTIVE",
      trialStartedAt: new Date().toISOString(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 7,
    },
    cityOrigin: "Goiânia (GO)",
    preferredDestinations: ["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi", "Gramado & Vale dos Vinhedos"],
    travelProfile: "Casal",
    authMethod: "Cadastro Clube",
    marketingOptIn: true,
    lgpdConsentTimestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    favoriteHotelIds: [],
    favoriteHotelNames: [],
    searchHistory: [],
    viewedHotels: [],
    checkoutIntents: [],
    bookings: [],
    campaignTags: ["Membro Private Ativo", "Administrador VIP", "PostgreSQL Conectado"],
  },
  {
    id: "MEM-8492",
    fullName: "Pedro Pereira",
    email: "membro@hospedeclub.com.br",
    whatsapp: "+55 (11) 99812-4400",
    cpf: "123.456.789-00",
    address: {
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      complement: "Apto 142",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    },
    passwordHash: hashPassword("membro123"),
    verification: {
      code: "849201",
      expiresAt: "2027-01-01T00:00:00.000Z",
      verified: true,
      attempts: 0,
    },
    membership: {
      status: "TRIAL_ACTIVE",
      trialStartedAt: new Date().toISOString(),
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 7,
    },
    cityOrigin: "São Paulo (SP)",
    preferredDestinations: ["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi", "Gramado & Vale dos Vinhedos"],
    travelProfile: "Casal",
    authMethod: "Cadastro Clube",
    marketingOptIn: true,
    lgpdConsentTimestamp: "2026-11-08T14:20:00.000Z",
    createdAt: "2026-11-08T14:20:00.000Z",
    lastActiveAt: new Date().toISOString(),
    favoriteHotelIds: ["velluto-palace-sao-conrado", "reserva-corais-maragogi"],
    favoriteHotelNames: [
      "Palácio Atlântico São Conrado & Spa",
      "Reserva dos Corais Private Bungalows",
    ],
    searchHistory: [],
    viewedHotels: [],
    checkoutIntents: [],
    bookings: [],
    campaignTags: ["Membro Private Ativo", "Opt-in WhatsApp"],
  },
];

const INITIAL_SEED_CAMPAIGNS: CampaignBroadcastRecord[] = [
  {
    id: "CAMP-101",
    title: "Flash Deal Membros: Nordeste Pé na Areia (-28% OFF)",
    channel: "WhatsApp VIP",
    segmentFilter: "Opt-in WhatsApp Ativo",
    discountOffer: "Até 28% OFF sobre Tarifa Oficial",
    destinationFocus: "Maceió, Maragogi, Porto de Galinhas & Trancoso",
    messageTemplate:
      "Olá {nome}! Liberamos 2 bangalôs pé na areia com Tarifa Secreta de Membro (até 28% abaixo da tarifa pública) para este mês.",
    recipientsCount: 3,
    createdAt: "2026-11-09T10:00:00.000Z",
  },
];

function computeCampaignTags(customer: CustomerCRMRecord): string[] {
  const tags = new Set<string>(["Membro Private Ativo"]);
  if (customer.marketingOptIn) tags.add("Opt-in WhatsApp");
  if (customer.bookings.length > 0) tags.add("Cliente Com Reserva");
  const hasUnconvertedCheckout = customer.checkoutIntents.some((c) => !c.converted);
  if (hasUnconvertedCheckout && customer.bookings.length === 0) {
    tags.add("Carrinho Abandonado");
  }
  if (customer.favoriteHotelIds.length > 0) {
    tags.add(`Favoritos (${customer.favoriteHotelIds.length})`);
  }
  return Array.from(tags);
}

export function readCRMDatabase(): CRMDatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE_PATH)) {
      const seedData: CRMDatabaseSchema = {
        customers: INITIAL_SEED_CUSTOMERS,
        campaigns: INITIAL_SEED_CAMPAIGNS,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(seedData, null, 2), "utf-8");
      return seedData;
    }
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as CRMDatabaseSchema;
    if (!Array.isArray(parsed.customers)) {
      parsed.customers = INITIAL_SEED_CUSTOMERS;
    }
    if (!Array.isArray(parsed.campaigns)) {
      parsed.campaigns = INITIAL_SEED_CAMPAIGNS;
    }

    // Garante que cada cliente tenha o membership calculado em tempo real
    parsed.customers = parsed.customers.map((c) => ({
      ...c,
      membership: computeMembershipStatus(c),
    }));

    return parsed;
  } catch {
    return {
      customers: INITIAL_SEED_CUSTOMERS,
      campaigns: INITIAL_SEED_CAMPAIGNS,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function writeCRMDatabase(db: CRMDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // fallback silencioso
  }
}

/**
 * Sincroniza um cliente recuperado do PostgreSQL no cache local JSON
 */
export function syncCustomerToLocalStore(customer: CustomerCRMRecord): void {
  try {
    const db = readCRMDatabase();
    const cleanEmail = customer.email.toLowerCase().trim();
    const idx = db.customers.findIndex((c) => c.email.toLowerCase().trim() === cleanEmail);
    if (idx >= 0) {
      db.customers[idx] = { ...db.customers[idx], ...customer };
    } else {
      db.customers.unshift(customer);
    }
    writeCRMDatabase(db);
  } catch {
    // ignore
  }
}

/**
 * =====================================================================
 * SISTEMA OFICIAL DE CADASTRO E VERIFICAÇÃO WHATSAPP
 * =====================================================================
 */

export interface RegisterCustomerInput {
  fullName: string;
  whatsapp: string;
  cpf: string;
  email: string;
  password?: string;
  address: CustomerAddress;
}

export function registerCustomerProfile(input: RegisterCustomerInput): {
  customer: CustomerCRMRecord;
  verificationCode: string;
} {
  const db = readCRMDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const cleanCpfDigits = sanitizeCpf(input.cpf);
  const cleanPhoneDigits = sanitizePhone(input.whatsapp);
  const now = new Date().toISOString();

  // Verifica duplicação de e-mail ou CPF
  const existing = db.customers.find((c) => {
    const sameEmail = c.email.toLowerCase() === normalizedEmail;
    const sameCpf = c.cpf && sanitizeCpf(c.cpf) === cleanCpfDigits;
    return sameEmail || sameCpf;
  });

  const verificationCode = generateVerificationCode();
  const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (existing) {
    // Se o cliente já existia mas não tinha verificado o WhatsApp, atualizamos e geramos novo código
    if (!existing.verification?.verified) {
      existing.fullName = input.fullName.trim();
      existing.whatsapp = input.whatsapp.trim();
      existing.cpf = input.cpf.trim();
      existing.address = input.address;
      if (input.password) existing.passwordHash = hashPassword(input.password);
      existing.verification = {
        code: verificationCode,
        expiresAt: codeExpiresAt,
        verified: false,
        attempts: 0,
      };
      existing.membership = {
        status: "TRIAL_ACTIVE",
        trialStartedAt: now,
        trialExpiresAt,
        daysRemaining: 7,
      };
      existing.lastActiveAt = now;
      writeCRMDatabase(db);
      return { customer: existing, verificationCode };
    }

    // Se já estava verificado, lança erro para ir para o login
    throw new Error(
      "Este e-mail ou CPF já possui cadastro no Hóspede Club. Por favor, acesse a aba 'Entrar'."
    );
  }

  // Cria novo cadastro de cliente
  const newCustomer: CustomerCRMRecord = {
    id: `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    whatsapp: input.whatsapp.trim(),
    cpf: input.cpf.trim(),
    address: input.address,
    passwordHash: input.password ? hashPassword(input.password) : undefined,
    verification: {
      code: verificationCode,
      expiresAt: codeExpiresAt,
      verified: false,
      attempts: 0,
    },
    membership: {
      status: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialExpiresAt,
      daysRemaining: 7,
    },
    cityOrigin: `${input.address.city} (${input.address.state})`,
    preferredDestinations: ["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi"],
    travelProfile: "Casal",
    authMethod: "Cadastro Clube",
    marketingOptIn: true,
    lgpdConsentTimestamp: now,
    createdAt: now,
    lastActiveAt: now,
    favoriteHotelIds: [],
    favoriteHotelNames: [],
    searchHistory: [],
    viewedHotels: [],
    checkoutIntents: [],
    bookings: [],
    campaignTags: ["Membro Private Ativo", "Opt-in WhatsApp", "Aguardando Código WhatsApp"],
  };

  db.customers.unshift(newCustomer);
  writeCRMDatabase(db);

  return { customer: newCustomer, verificationCode };
}

/**
 * Validação do código de 6 dígitos enviado por WhatsApp
 */
export function verifyWhatsAppVerificationCode(
  identifier: string,
  code: string
): CustomerCRMRecord {
  const db = readCRMDatabase();
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, "");

  const customer = db.customers.find((c) => {
    return (
      c.id === identifier ||
      c.email.toLowerCase() === cleanId ||
      sanitizeCpf(c.cpf || "") === cleanDigits ||
      sanitizePhone(c.whatsapp) === cleanDigits
    );
  });

  if (!customer) {
    throw new Error("Cadastro não localizado. Verifique os dados ou faça um novo cadastro.");
  }

  if (!customer.verification) {
    throw new Error("Nenhum código de verificação pendente para este cadastro.");
  }

  if (customer.verification.attempts >= 5) {
    throw new Error(
      "Limite de tentativas excedido (5x). Por favor, solicite o reenvio de um novo código."
    );
  }

  const now = Date.now();
  const expiresAt = new Date(customer.verification.expiresAt).getTime();

  if (now > expiresAt) {
    throw new Error("O código de verificação expirou (15 minutos). Solicite um novo código.");
  }

  if (customer.verification.code !== code.trim()) {
    customer.verification.attempts += 1;
    writeCRMDatabase(db);
    throw new Error("Código incorreto. Digite o código de 6 dígitos enviado ao seu WhatsApp.");
  }

  // Código confirmado com sucesso!
  customer.verification.verified = true;
  customer.verification.attempts = 0;
  customer.membership = {
    status: "TRIAL_ACTIVE",
    trialStartedAt: new Date().toISOString(),
    trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysRemaining: 7,
  };
  customer.lastActiveAt = new Date().toISOString();
  customer.campaignTags = customer.campaignTags.filter((t) => t !== "Aguardando Código WhatsApp");

  writeCRMDatabase(db);
  return customer;
}

/**
 * Reenvio de novo código de verificação
 */
export function resendCustomerWhatsAppCode(identifier: string): {
  customer: CustomerCRMRecord;
  newCode: string;
} {
  const db = readCRMDatabase();
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, "");

  const customer = db.customers.find((c) => {
    return (
      c.id === identifier ||
      c.email.toLowerCase() === cleanId ||
      sanitizeCpf(c.cpf || "") === cleanDigits ||
      sanitizePhone(c.whatsapp) === cleanDigits
    );
  });

  if (!customer) {
    throw new Error("Cliente não encontrado.");
  }

  const newCode = generateVerificationCode();
  const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  customer.verification = {
    code: newCode,
    expiresAt: codeExpiresAt,
    verified: false,
    attempts: 0,
  };
  customer.lastActiveAt = new Date().toISOString();

  writeCRMDatabase(db);
  return { customer, newCode };
}

/**
 * Autenticação de Login (por Senha ou Código WhatsApp)
 */
export function authenticateCustomerCredentials(
  identifier: string,
  secret: string,
  mode: "password" | "code" = "password"
): CustomerCRMRecord {
  const db = readCRMDatabase();
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, "");

  const customer = db.customers.find((c) => {
    return (
      c.email.toLowerCase() === cleanId ||
      (c.cpf && sanitizeCpf(c.cpf) === cleanDigits) ||
      sanitizePhone(c.whatsapp) === cleanDigits
    );
  });

  if (!customer) {
    throw new Error("Nenhum cadastro encontrado com este e-mail ou CPF.");
  }

  if (mode === "password") {
    const hashed = hashPassword(secret);
    if (customer.passwordHash && customer.passwordHash !== hashed) {
      throw new Error("Senha incorreta. Verifique os dados ou solicite código via WhatsApp.");
    }
  } else {
    // Mode code
    if (!customer.verification || customer.verification.code !== secret.trim()) {
      throw new Error("Código de segurança inválido.");
    }
  }

  customer.lastActiveAt = new Date().toISOString();
  customer.membership = computeMembershipStatus(customer);
  writeCRMDatabase(db);

  return customer;
}

/**
 * Consulta de Sessão do Cliente
 */
export function getCustomerSessionProfile(customerId: string): CustomerCRMRecord | null {
  const db = readCRMDatabase();
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return null;

  customer.membership = computeMembershipStatus(customer);
  return customer;
}

/**
 * Assinatura do Plano Hóspede Club R$ 19,90/mês
 */
export function subscribeCustomerToClub(
  customerId: string,
  paymentMethod: "PIX" | "CARD"
): CustomerCRMRecord {
  const db = readCRMDatabase();
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error("Cliente não encontrado.");

  const now = new Date();
  const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  customer.membership = {
    status: "SUBSCRIBED",
    trialStartedAt: customer.membership?.trialStartedAt || now.toISOString(),
    trialExpiresAt: customer.membership?.trialExpiresAt || now.toISOString(),
    daysRemaining: 30,
    subscriptionPlan: {
      active: true,
      priceBRL: 19.9,
      billingCycle: "monthly",
      nextBillingAt: nextBilling,
      paymentMethod,
    },
  };
  customer.lastActiveAt = now.toISOString();

  writeCRMDatabase(db);
  return customer;
}

export function upsertCustomerProfile(input: {
  id?: string;
  fullName: string;
  email: string;
  whatsapp: string;
  cpf?: string;
  address?: CustomerAddress;
  cityOrigin?: string;
  preferredDestinations?: string[];
  travelProfile?: "Casal" | "Família" | "Villas & Grupos";
  authMethod?: CustomerCRMRecord["authMethod"];
  marketingOptIn?: boolean;
  favoriteHotelIds?: string[];
  favoriteHotelNames?: string[];
}): CustomerCRMRecord {
  const db = readCRMDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  let existing = db.customers.find(
    (c) =>
      (input.id && c.id === input.id) ||
      (normalizedEmail && c.email.toLowerCase() === normalizedEmail)
  );

  if (existing) {
    existing.fullName = input.fullName.trim() || existing.fullName;
    existing.email = normalizedEmail || existing.email;
    existing.whatsapp = input.whatsapp.trim() || existing.whatsapp;
    if (input.cpf) existing.cpf = input.cpf;
    if (input.address) existing.address = input.address;
    if (input.cityOrigin) existing.cityOrigin = input.cityOrigin;
    if (input.preferredDestinations && input.preferredDestinations.length > 0) {
      existing.preferredDestinations = input.preferredDestinations;
    }
    if (input.travelProfile) existing.travelProfile = input.travelProfile;
    if (input.authMethod) existing.authMethod = input.authMethod;
    if (typeof input.marketingOptIn === "boolean") {
      existing.marketingOptIn = input.marketingOptIn;
    }
    if (input.favoriteHotelIds) {
      existing.favoriteHotelIds = input.favoriteHotelIds;
    }
    if (input.favoriteHotelNames) {
      existing.favoriteHotelNames = input.favoriteHotelNames;
    }
    existing.lastActiveAt = now;
    existing.campaignTags = computeCampaignTags(existing);
    existing.membership = computeMembershipStatus(existing);
  } else {
    const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newCustomer: CustomerCRMRecord = {
      id: input.id || `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: input.fullName.trim() || "Membro Hóspede Club",
      email: normalizedEmail || `membro.${Date.now()}@hospedeclub.com.br`,
      whatsapp: input.whatsapp.trim() || "+55 (11) 99999-0000",
      cpf: input.cpf,
      address: input.address,
      cityOrigin: input.cityOrigin || "São Paulo (SP)",
      preferredDestinations:
        input.preferredDestinations && input.preferredDestinations.length > 0
          ? input.preferredDestinations
          : ["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi"],
      travelProfile: input.travelProfile || "Casal",
      authMethod: input.authMethod || "Cadastro Clube",
      marketingOptIn: input.marketingOptIn ?? true,
      lgpdConsentTimestamp: now,
      createdAt: now,
      lastActiveAt: now,
      verification: {
        code: generateVerificationCode(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        verified: true,
        attempts: 0,
      },
      membership: {
        status: "TRIAL_ACTIVE",
        trialStartedAt: now,
        trialExpiresAt,
        daysRemaining: 7,
      },
      favoriteHotelIds: input.favoriteHotelIds || [],
      favoriteHotelNames: input.favoriteHotelNames || [],
      searchHistory: [],
      viewedHotels: [],
      checkoutIntents: [],
      bookings: [],
      campaignTags: [],
    };
    newCustomer.campaignTags = computeCampaignTags(newCustomer);
    db.customers.unshift(newCustomer);
    existing = newCustomer;
  }

  writeCRMDatabase(db);
  return existing;
}

export function recordCustomerActivity(input: {
  customerId?: string;
  email?: string;
  fullName?: string;
  whatsapp?: string;
  cityOrigin?: string;
  activityType:
    | "SEARCH"
    | "VIEW_HOTEL"
    | "FAVORITE_SYNC"
    | "CHECKOUT_INTENT"
    | "BOOKING_CONFIRMED"
    | "DELETE_ACCOUNT";
  payload: Record<string, unknown>;
}): CustomerCRMRecord | null {
  const db = readCRMDatabase();
  const now = new Date().toISOString();

  if (input.activityType === "DELETE_ACCOUNT") {
    const idx = db.customers.findIndex(
      (c) =>
        (input.customerId && c.id === input.customerId) ||
        (input.email && c.email.toLowerCase() === input.email.toLowerCase())
    );
    if (idx !== -1) {
      db.customers.splice(idx, 1);
      writeCRMDatabase(db);
    }
    return null;
  }

  let customer = db.customers.find(
    (c) =>
      (input.customerId && c.id === input.customerId) ||
      (input.email && c.email.toLowerCase() === input.email.toLowerCase())
  );

  if (!customer) {
    customer = upsertCustomerProfile({
      id: input.customerId,
      fullName: input.fullName || "Visitante Membro",
      email: input.email || "membro@hospedeclub.com.br",
      whatsapp: input.whatsapp || "+55 (11) 99812-4400",
      cityOrigin: input.cityOrigin || "São Paulo (SP)",
    });
    const freshDb = readCRMDatabase();
    customer =
      freshDb.customers.find((c) => c.id === customer!.id) || freshDb.customers[0];
    return recordCustomerActivityWithLoadedDb(freshDb, customer, input.activityType, input.payload, now);
  }

  return recordCustomerActivityWithLoadedDb(db, customer, input.activityType, input.payload, now);
}

function recordCustomerActivityWithLoadedDb(
  db: CRMDatabaseSchema,
  customer: CustomerCRMRecord,
  activityType: string,
  payload: Record<string, unknown>,
  now: string
): CustomerCRMRecord {
  customer.lastActiveAt = now;

  if (activityType === "SEARCH") {
    const searchEvent: CustomerSearchEvent = {
      query: String(payload.query || ""),
      destinationName: String(payload.destinationName || ""),
      checkInDate: String(payload.checkInDate || "2026-11-13"),
      nights: Number(payload.nights || 3),
      guests: Number(payload.guests || 2),
      timestamp: now,
    };
    customer.searchHistory = [searchEvent, ...customer.searchHistory.slice(0, 19)];
    if (
      searchEvent.destinationName &&
      !customer.preferredDestinations.includes(searchEvent.destinationName)
    ) {
      customer.preferredDestinations = [
        searchEvent.destinationName,
        ...customer.preferredDestinations.slice(0, 5),
      ];
    }
  } else if (activityType === "VIEW_HOTEL") {
    const viewEvent: CustomerViewedHotelEvent = {
      hotelId: String(payload.hotelId || ""),
      hotelName: String(payload.hotelName || ""),
      cityName: String(payload.cityName || ""),
      stateCode: String(payload.stateCode || ""),
      timestamp: now,
    };
    customer.viewedHotels = [
      viewEvent,
      ...customer.viewedHotels.filter((v) => v.hotelId !== viewEvent.hotelId).slice(0, 14),
    ];
  } else if (activityType === "FAVORITE_SYNC") {
    if (Array.isArray(payload.favoriteHotelIds)) {
      customer.favoriteHotelIds = payload.favoriteHotelIds.map(String);
    }
    if (Array.isArray(payload.favoriteHotelNames)) {
      customer.favoriteHotelNames = payload.favoriteHotelNames.map(String);
    }
  } else if (activityType === "CHECKOUT_INTENT") {
    const intentEvent: CustomerCheckoutIntentEvent = {
      hotelId: String(payload.hotelId || ""),
      hotelName: String(payload.hotelName || ""),
      roomName: String(payload.roomName || ""),
      paymentMethod: payload.paymentMethod === "CARD" ? "CARD" : "PIX",
      estimatedTotal: Number(payload.estimatedTotal || 0),
      nights: Number(payload.nights || 3),
      checkInDate: String(payload.checkInDate || "2026-11-13"),
      converted: false,
      timestamp: now,
    };
    customer.checkoutIntents = [intentEvent, ...customer.checkoutIntents.slice(0, 9)];
  } else if (activityType === "BOOKING_CONFIRMED") {
    const bookingEvent: CustomerBookingRecord = {
      bookingId: String(payload.bookingId || `BK-${Date.now()}`),
      voucherCode: String(payload.voucherCode || `VL-${Date.now()}`),
      hotelId: String(payload.hotelId || ""),
      hotelName: String(payload.hotelName || ""),
      roomName: String(payload.roomName || ""),
      checkInDate: String(payload.checkInDate || "2026-11-13"),
      nights: Number(payload.nights || 3),
      guests: Number(payload.guests || 2),
      paymentMethod: payload.paymentMethod === "CARD" ? "CARD" : "PIX",
      totalPaid: Number(payload.totalPaid || 0),
      cashbackEarned: Number(payload.cashbackEarned || 0),
      createdAt: now,
    };
    customer.bookings = [bookingEvent, ...customer.bookings];
    customer.checkoutIntents = customer.checkoutIntents.map((intent) =>
      intent.hotelId === bookingEvent.hotelId ? { ...intent, converted: true } : intent
    );
    // Ativa status de membro por nova reserva
    customer.membership = computeMembershipStatus(customer);
  }

  customer.campaignTags = computeCampaignTags(customer);
  writeCRMDatabase(db);
  return customer;
}

export function createCampaignBroadcast(input: {
  title: string;
  channel: CampaignBroadcastRecord["channel"];
  segmentFilter: string;
  discountOffer: string;
  destinationFocus: string;
  messageTemplate: string;
  recipientsCount: number;
}): CampaignBroadcastRecord {
  const db = readCRMDatabase();
  const campaign: CampaignBroadcastRecord = {
    id: `CAMP-${Math.floor(100 + Math.random() * 900)}`,
    title: input.title,
    channel: input.channel,
    segmentFilter: input.segmentFilter,
    discountOffer: input.discountOffer,
    destinationFocus: input.destinationFocus,
    messageTemplate: input.messageTemplate,
    recipientsCount: input.recipientsCount,
    createdAt: new Date().toISOString(),
  };
  db.campaigns.unshift(campaign);
  writeCRMDatabase(db);
  return campaign;
}
