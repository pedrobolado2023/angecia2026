-- ============================================================================
-- HÓSPEDE CLUB — Modelagem Relacional PostgreSQL / Supabase (Fase 2 - Passo 2.1)
-- Auditado por: Agente 02 (RM & FinOps) & Agente 03 (Omnibees & API)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela: hotels (Catálogo Estático Sincronizado Omnibees + Extranet Direta + Villas)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    subtitle TEXT,
    accommodation_type VARCHAR(20) NOT NULL DEFAULT 'hotel' CHECK (accommodation_type IN ('hotel', 'villa')),
    city_id VARCHAR(80) NOT NULL,
    city_name VARCHAR(120) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    neighborhood VARCHAR(120),
    cluster_id VARCHAR(20) NOT NULL CHECK (cluster_id IN ('cluster-1', 'cluster-2', 'cluster-3')),
    omnibees_hotel_code VARCHAR(50) UNIQUE,
    channel_manager_provider VARCHAR(40) DEFAULT 'OMNIBEES' CHECK (channel_manager_provider IN ('OMNIBEES', 'EXTRANET_DIRECT', 'STAYS_NET', 'AVANTIO', 'GUESTY')),
    stars SMALLINT DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
    rating_score NUMERIC(3, 1) DEFAULT 9.8,
    primary_landmark_distance VARCHAR(255) NOT NULL,
    cleaning_fee_brl NUMERIC(10, 2) DEFAULT 0.00 CHECK (cleaning_fee_brl >= 0), -- Exclusivo para Villas (Fase 6)
    security_deposit_brl NUMERIC(10, 2) DEFAULT 0.00 CHECK (security_deposit_brl >= 0), -- Caução segregada do Markup (Fase 6)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela: room_types (Categorias de Suítes e Bangalôs)
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    omnibees_room_code VARCHAR(50),
    name VARCHAR(160) NOT NULL,
    size_m2 INT NOT NULL CHECK (size_m2 > 0),
    view_label VARCHAR(120),
    bed_config VARCHAR(120),
    board_basis VARCHAR(120) NOT NULL DEFAULT 'Café da Manhã Incluso',
    max_occupancy SMALLINT DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: rate_plans_net (Tarifários Net, BAR, Allotment e Regras ARI Omnibees/Extranet)
CREATE TABLE IF NOT EXISTS rate_plans_net (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    season_name VARCHAR(80) NOT NULL DEFAULT 'Regular / Acordo Direto',
    season_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR' CHECK (season_type IN ('LOW', 'REGULAR', 'HIGH', 'FLASH_DEAL')),
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    net_rate_brl NUMERIC(10, 2) NOT NULL CHECK (net_rate_brl > 50.00), -- Trava Hard Floor FinOps
    bar_rate_brl NUMERIC(10, 2) NOT NULL CHECK (bar_rate_brl >= net_rate_brl),
    allotment_available INT NOT NULL DEFAULT 5 CHECK (allotment_available >= 0),
    min_stay SMALLINT NOT NULL DEFAULT 2 CHECK (min_stay >= 1),
    stop_sell BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by VARCHAR(80) DEFAULT 'OMNIBEES_ARI_SYNC',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_valid_date_range CHECK (valid_to >= valid_from)
);

-- 4. Tabela: markup_rules (Regras Dinâmicas de Markup por Hotel, Cidade ou Cluster)
CREATE TABLE IF NOT EXISTS markup_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('GLOBAL', 'CLUSTER', 'CITY', 'HOTEL')),
    scope_reference VARCHAR(120) NOT NULL,
    target_net_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (target_net_margin_percent >= 15.00),
    pix_gross_anchor_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    pix_gateway_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.80,
    pix_cashback_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    card_anticipation_start_installment SMALLINT NOT NULL DEFAULT 4,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: bookings (Reservas, Conciliação Financeira e Sincronização PMS/Omnibees)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_code VARCHAR(40) UNIQUE NOT NULL,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    member_email VARCHAR(180) NOT NULL,
    member_name VARCHAR(160) NOT NULL,
    member_whatsapp VARCHAR(40),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights_count SMALLINT NOT NULL CHECK (nights_count >= 1),
    payment_modality VARCHAR(20) NOT NULL CHECK (payment_modality IN ('PIX', 'CREDIT_CARD')),
    installments SMALLINT NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 12),
    -- Auditoria Financeira Segregada (Agente 02 RM & Gate 6 Villas — Sem serviços opcionais de terceiros)
    net_room_total_brl NUMERIC(10, 2) NOT NULL CHECK (net_room_total_brl > 0),
    bar_room_total_brl NUMERIC(10, 2) NOT NULL,
    cleaning_fee_brl NUMERIC(10, 2) NOT NULL DEFAULT 0.00,     -- Não sofre markup de 15% (Gate 6)
    security_deposit_brl NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Caução segregada (Gate 6)
    gateway_fee_brl NUMERIC(10, 2) NOT NULL,
    total_charged_brl NUMERIC(10, 2) NOT NULL,
    hospede_net_profit_brl NUMERIC(10, 2) NOT NULL,
    hospede_net_margin_percent NUMERIC(5, 2) NOT NULL CHECK (hospede_net_margin_percent >= 15.00),
    -- Status de Webhook & Booking Push Omnibees
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_WEBHOOK' CHECK (payment_status IN ('PENDING_WEBHOOK', 'PAID_CONFIRMED', 'FAILED', 'REFUNDED')),
    omnibees_push_status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK (omnibees_push_status IN ('AWAITING_PAYMENT', 'PUSHED_CONFIRMED', 'MANUAL_FALLBACK')),
    omnibees_pms_locator VARCHAR(60),
    voucher_emitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: customers (CRM de Membros Hóspede Club — Salvo no Backend para Campanhas)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    whatsapp VARCHAR(40) NOT NULL,
    city_origin VARCHAR(120) DEFAULT 'São Paulo (SP)',
    travel_profile VARCHAR(40) DEFAULT 'Casal' CHECK (travel_profile IN ('Casal', 'Família', 'Villas & Grupos')),
    preferred_destinations TEXT[] DEFAULT '{}',
    favorite_hotel_ids TEXT[] DEFAULT '{}',
    campaign_tags TEXT[] DEFAULT '{}',
    auth_method VARCHAR(40) DEFAULT 'Cadastro Clube',
    marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    lgpd_consent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: customer_activity_logs (Rastreamento 360° de Buscas, Hotéis Vistos, Favoritos e Carrinhos)
CREATE TABLE IF NOT EXISTS customer_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    activity_type VARCHAR(40) NOT NULL CHECK (activity_type IN ('SEARCH', 'VIEW_HOTEL', 'FAVORITE_SYNC', 'CHECKOUT_INTENT', 'BOOKING_CONFIRMED')),
    destination_name VARCHAR(160),
    hotel_id VARCHAR(120),
    hotel_name VARCHAR(200),
    check_in_date DATE,
    nights_count SMALLINT,
    guests_count SMALLINT,
    estimated_total_brl NUMERIC(10, 2),
    payment_method VARCHAR(20),
    converted BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela: member_campaigns (Campanhas Segmentadas de Membros — WhatsApp VIP & E-mail)
CREATE TABLE IF NOT EXISTS member_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(220) NOT NULL,
    channel VARCHAR(40) NOT NULL CHECK (channel IN ('WhatsApp VIP', 'E-mail Editorial', 'Push + WhatsApp')),
    segment_filter VARCHAR(80) NOT NULL,
    discount_offer VARCHAR(120),
    destination_focus VARCHAR(200),
    message_template TEXT NOT NULL,
    recipients_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blindagem Row-Level Security (RLS) — Protege Tarifas Net e Base de Clientes (Gate 7 Zero-Leak)
ALTER TABLE rate_plans_net ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hotels_city_cluster ON hotels(city_id, cluster_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_availability ON rate_plans_net(room_type_id, valid_from, valid_to, stop_sell);
CREATE INDEX IF NOT EXISTS idx_bookings_voucher ON bookings(voucher_code);
CREATE INDEX IF NOT EXISTS idx_customers_email_optin ON customers(email, marketing_opt_in);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity_logs(customer_id, activity_type, created_at DESC);

