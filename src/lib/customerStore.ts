import fs from "fs";
import path from "path";

if (typeof window !== "undefined") {
  throw new Error(
    "[SEGURANÇA HÓSPEDE CLUB] customerStore.ts é exclusivo do Backend (Node.js)."
  );
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

const INITIAL_SEED_CUSTOMERS: CustomerCRMRecord[] = [
  {
    id: "MEM-8492",
    fullName: "Pedro Pereira",
    email: "membro@hospedeclub.com.br",
    whatsapp: "+55 (11) 99812-4400",
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
    searchHistory: [
      {
        query: "Rio de Janeiro, Búzios & Angra (RJ)",
        destinationName: "Rio de Janeiro, Búzios & Angra",
        checkInDate: "2026-11-13",
        nights: 3,
        guests: 2,
        timestamp: "2026-11-09T11:30:00.000Z",
      },
      {
        query: "Maragogi",
        destinationName: "Maceió, Milagres & Maragogi",
        checkInDate: "2026-12-10",
        nights: 5,
        guests: 2,
        timestamp: "2026-11-09T12:10:00.000Z",
      },
    ],
    viewedHotels: [
      {
        hotelId: "velluto-palace-sao-conrado",
        hotelName: "Palácio Atlântico São Conrado & Spa",
        cityName: "Rio de Janeiro",
        stateCode: "RJ",
        timestamp: "2026-11-09T11:35:00.000Z",
      },
      {
        hotelId: "reserva-corais-maragogi",
        hotelName: "Reserva dos Corais Private Bungalows",
        cityName: "Maceió & Maragogi",
        stateCode: "AL",
        timestamp: "2026-11-09T12:12:00.000Z",
      },
    ],
    checkoutIntents: [
      {
        hotelId: "velluto-palace-sao-conrado",
        hotelName: "Palácio Atlântico São Conrado & Spa",
        roomName: "Suíte Deluxe Vista Mar Frontal",
        paymentMethod: "PIX",
        estimatedTotal: 5670,
        nights: 3,
        checkInDate: "2026-11-13",
        converted: true,
        timestamp: "2026-11-09T12:15:00.000Z",
      },
    ],
    bookings: [
      {
        bookingId: "BK-994012",
        voucherCode: "HC-849201-OMNI",
        hotelId: "velluto-palace-sao-conrado",
        hotelName: "Palácio Atlântico São Conrado & Spa",
        roomName: "Suíte Deluxe Vista Mar Frontal",
        checkInDate: "2026-11-13",
        nights: 3,
        guests: 2,
        paymentMethod: "PIX",
        totalPaid: 5670,
        cashbackEarned: 170,
        createdAt: "2026-11-09T12:18:00.000Z",
      },
    ],
    campaignTags: [
      "Membro Private Ativo",
      "Opt-in WhatsApp",
      "Cliente Com Reserva",
      "Interesse: Rio & Nordeste",
      "Pagador PIX",
    ],
  },
  {
    id: "MEM-7310",
    fullName: "Helena Albuquerque",
    email: "helena.albuquerque@patrimonio.com.br",
    whatsapp: "+55 (61) 99204-8810",
    cityOrigin: "Brasília (DF)",
    preferredDestinations: ["Trancoso & Praia do Forte", "Porto de Galinhas & Carneiros"],
    travelProfile: "Villas & Grupos",
    authMethod: "WhatsApp VIP",
    marketingOptIn: true,
    lgpdConsentTimestamp: "2026-11-07T18:10:00.000Z",
    createdAt: "2026-11-07T18:10:00.000Z",
    lastActiveAt: "2026-11-09T10:45:00.000Z",
    favoriteHotelIds: ["casa-quadrado-trancoso", "mansao-peninsula-angra-villa"],
    favoriteHotelNames: [
      "Vila Nativos & Quadrado Boutique",
      "Villa Frade Private Peninsula (6 Suítes)",
    ],
    searchHistory: [
      {
        query: "Trancoso",
        destinationName: "Trancoso & Praia do Forte",
        checkInDate: "2026-11-20",
        nights: 5,
        guests: 6,
        timestamp: "2026-11-09T10:30:00.000Z",
      },
    ],
    viewedHotels: [
      {
        hotelId: "casa-quadrado-trancoso",
        hotelName: "Vila Nativos & Quadrado Boutique",
        cityName: "Trancoso & Praia do Forte",
        stateCode: "BA",
        timestamp: "2026-11-09T10:35:00.000Z",
      },
    ],
    checkoutIntents: [
      {
        hotelId: "casa-quadrado-trancoso",
        hotelName: "Vila Nativos & Quadrado Boutique",
        roomName: "Villa Reserva Trancoso (3 Suítes + Piscina)",
        paymentMethod: "PIX",
        estimatedTotal: 22565,
        nights: 5,
        checkInDate: "2026-11-20",
        converted: false,
        timestamp: "2026-11-09T10:42:00.000Z",
      },
    ],
    bookings: [],
    campaignTags: [
      "Membro Private Ativo",
      "Opt-in WhatsApp",
      "Carrinho Abandonado",
      "Interesse: Villas & Bahia",
      "Ticket Alto",
    ],
  },
  {
    id: "MEM-6194",
    fullName: "Ricardo Mendonça",
    email: "ricardo.mendonca@agroholding.com.br",
    whatsapp: "+55 (62) 98115-3090",
    cityOrigin: "Goiânia (GO)",
    preferredDestinations: ["Rio Quente, Caldas & Pirenópolis", "Gramado & Vale dos Vinhedos"],
    travelProfile: "Família",
    authMethod: "Google",
    marketingOptIn: true,
    lgpdConsentTimestamp: "2026-11-06T09:15:00.000Z",
    createdAt: "2026-11-06T09:15:00.000Z",
    lastActiveAt: "2026-11-09T09:20:00.000Z",
    favoriteHotelIds: ["grand-thermas-rio-quente-piri", "chateau-velluto-gramado"],
    favoriteHotelNames: [
      "Reserva das Águas Private Thermal Resort",
      "Château des Vignes Gramado & Spa",
    ],
    searchHistory: [
      {
        query: "Goiás",
        destinationName: "Rio Quente, Caldas & Pirenópolis",
        checkInDate: "2026-11-27",
        nights: 4,
        guests: 4,
        timestamp: "2026-11-09T09:15:00.000Z",
      },
    ],
    viewedHotels: [
      {
        hotelId: "grand-thermas-rio-quente-piri",
        hotelName: "Reserva das Águas Private Thermal Resort",
        cityName: "Rio Quente, Caldas & Pirenópolis",
        stateCode: "GO",
        timestamp: "2026-11-09T09:18:00.000Z",
      },
    ],
    checkoutIntents: [],
    bookings: [
      {
        bookingId: "BK-882104",
        voucherCode: "VL-619402-OMNI",
        hotelId: "grand-thermas-rio-quente-piri",
        hotelName: "Reserva das Águas Private Thermal Resort",
        roomName: "Suíte Master Família Termal (2 Ambientes)",
        checkInDate: "2026-11-27",
        nights: 4,
        guests: 4,
        paymentMethod: "CARD",
        totalPaid: 6840,
        cashbackEarned: 0,
        createdAt: "2026-11-08T19:40:00.000Z",
      },
    ],
    campaignTags: [
      "Membro Private Ativo",
      "Opt-in WhatsApp",
      "Cliente Com Reserva",
      "Interesse: Família & Águas Quentes",
    ],
  },
];

const INITIAL_SEED_CAMPAIGNS: CampaignBroadcastRecord[] = [
  {
    id: "CAMP-101",
    title: "Flash Deal Membros: Nordeste Pé na Areia (-28% OFF + 3% Cashback PIX)",
    channel: "WhatsApp VIP",
    segmentFilter: "Opt-in WhatsApp Ativo",
    discountOffer: "Até 28% OFF sobre Tarifa Oficial",
    destinationFocus: "Maceió, Maragogi, Porto de Galinhas & Trancoso",
    messageTemplate:
      "Olá {nome}! Liberamos 2 bangalôs pé na areia com Tarifa Secreta de Membro (até 28% abaixo da tarifa pública) + 3% de Cashback no PIX para este mês.",
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
  if (customer.travelProfile === "Villas & Grupos") {
    tags.add("Interesse: Villas");
  } else if (customer.travelProfile === "Família") {
    tags.add("Perfil Família");
  } else {
    tags.add("Perfil Casal");
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
    // fallback silencioso se ambiente for read-only
  }
}

export function upsertCustomerProfile(input: {
  id?: string;
  fullName: string;
  email: string;
  whatsapp: string;
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
  } else {
    const newCustomer: CustomerCRMRecord = {
      id: input.id || `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: input.fullName.trim() || "Membro Hóspede Club",
      email: normalizedEmail || `membro.${Date.now()}@hospedeclub.com.br`,
      whatsapp: input.whatsapp.trim() || "+55 (11) 99999-0000",
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
    // Recarrega db após upsert
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

