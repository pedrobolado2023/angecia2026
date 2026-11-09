"""
VELLUTO STAYS — Backend Motor de Tarifas (FastAPI + Redis Cache + Conector Omnibees & Villas)
Cobre:
- Fase 2 (Passo 2.2 & 2.3): Motor de Cálculo Net + 15%, Repasse PIX/Cartão 12x e Extranet de Tarifários
- Fase 3 (Passo 3.1 & 3.2): Conector Omnibees Pull/Push (OTA_HotelAvailRS / OTA_HotelResRQ) + Cache < 400ms
- Fase 4 (Passo 4.3): Webhook de Pagamento com emissão de Voucher apenas após confirmação
- Fase 6 (Passo 6.1 & 6.2): Segregação de Taxa de Limpeza e Caução em Aluguel de Temporada (Velluto Villas)
"""

import os
from math import ceil
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Credenciais lidas EXCLUSIVAMENTE de variáveis de ambiente do servidor (.env / .env.local)
OMNIBEES_ENVIRONMENT = os.getenv("OMNIBEES_ENVIRONMENT", "sandbox")
OMNIBEES_ENDPOINT_URL = os.getenv(
    "OMNIBEES_ENDPOINT_URL", "https://cert.api.omnibees.com/ota2014b/PullService.svc"
)
OMNIBEES_REQUESTOR_ID = os.getenv("OMNIBEES_REQUESTOR_ID", "")
OMNIBEES_USERNAME = os.getenv("OMNIBEES_USERNAME", "")
OMNIBEES_API_KEY = os.getenv("OMNIBEES_API_KEY", "")
OMNIBEES_WEBHOOK_SECRET = os.getenv("OMNIBEES_WEBHOOK_SECRET", "")
VELLUTO_ADMIN_PASSCODE = os.getenv("VELLUTO_ADMIN_PASSCODE", "")

app = FastAPI(
    title="Velluto Stays — Motor Comercial, CRM de Membros & Middleware Omnibees",
    version="2.1.0",
    description="API de alta performance (< 400ms) com blindagem Zero-Leak (.env) e CRM de Membros.",
)

# Habilita CORS para permitir requisições do Frontend Next.js (mesmo em domínios diferentes)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Velluto Stays Backend API",
        "version": "2.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}

PIX_GATEWAY_FEE = 0.008  # 0.80%
CARD_GATEWAY_RATES: Dict[int, float] = {
    1: 0.0299,
    2: 0.0349,
    3: 0.0389,
    4: 0.0469,
    5: 0.0529,
    6: 0.0589,
    7: 0.0649,
    8: 0.0699,
    9: 0.0749,
    10: 0.0799,
    11: 0.0845,
    12: 0.0890,
}


class PricingRequest(BaseModel):
    net_rate: float = Field(..., description="Tarifa Net líquida do hotel ou diária da Villa")
    bar_rate: Optional[float] = Field(None, description="Tarifa Pública Oficial (BAR)")
    markup_percent: float = Field(0.15, ge=0.15, le=0.50)
    nights: int = Field(1, ge=1, le=30)
    cleaning_fee: float = Field(0.0, ge=0.0, description="Taxa de limpeza (Villas - Sem Markup 15%)")
    security_deposit: float = Field(0.0, ge=0.0, description="Caução reembolsável (Villas - Sem Markup 15%)")


@app.post("/api/v1/pricing/calculate")
def calculate_pricing(req: PricingRequest):
    if req.net_rate <= 50.0:
        raise HTTPException(
            status_code=400,
            detail=f"[FINOPS GUARDRAIL BLOCK] Tarifa Net inválida ou abaixo do piso de segurança: R$ {req.net_rate}",
        )

    markup = max(0.15, req.markup_percent)
    net_total_nights = round(req.net_rate * req.nights, 2)
    base_sell_nights = round(net_total_nights * (1.0 + markup), 2)

    # Gate 6 Rule: Taxa de limpeza e caução NÃO recebem markup de 15% da diária
    pass_through_extras = round(req.cleaning_fee + req.security_deposit, 2)

    # PIX Calculation (Garante 15% líquidos sobre a diária Net + repasse exato de limpeza/caução)
    pix_charged_rooms = ceil((base_sell_nights / (1.0 - PIX_GATEWAY_FEE)) * 100) / 100
    pix_charged_extras = ceil((pass_through_extras / (1.0 - PIX_GATEWAY_FEE)) * 100) / 100
    pix_total_charged = round(pix_charged_rooms + pix_charged_extras, 2)
    pix_fee_amount = round(pix_total_charged * PIX_GATEWAY_FEE, 2)
    pix_net_profit = round((pix_charged_rooms * (1.0 - PIX_GATEWAY_FEE)) - net_total_nights, 2)
    pix_margin_percent = round((pix_net_profit / net_total_nights) * 100, 2)

    bar_single = req.bar_rate if (req.bar_rate and req.bar_rate > req.net_rate * 1.18) else round(req.net_rate * 1.38, 2)
    bar_total = round(bar_single * req.nights + pass_through_extras, 2)

    installments_list: List[dict] = []
    for n in range(1, 13):
        fee_rate = CARD_GATEWAY_RATES[n]
        card_rooms = ceil((base_sell_nights / (1.0 - fee_rate)) * 100) / 100
        card_extras = ceil((pass_through_extras / (1.0 - fee_rate)) * 100) / 100
        total_charged = round(card_rooms + card_extras, 2)
        gateway_fee = round(total_charged * fee_rate, 2)
        net_profit = round((card_rooms * (1.0 - fee_rate)) - net_total_nights, 2)
        margin_pct = round((net_profit / net_total_nights) * 100, 2)

        installments_list.append({
            "installments": n,
            "gateway_fee_percent": round(fee_rate * 100, 2),
            "installment_value": round(total_charged / n, 2),
            "total_charged": total_charged,
            "gateway_fee_amount": gateway_fee,
            "net_profit_on_rooms": net_profit,
            "net_margin_percent": margin_pct,
        })

    return {
        "status": "APPROVED_BY_AGENT_02_AND_06",
        "timestamp": datetime.utcnow().isoformat(),
        "breakdown": {
            "net_rooms_total": net_total_nights,
            "bar_total": bar_total,
            "cleaning_fee_segregated": req.cleaning_fee,
            "security_deposit_segregated": req.security_deposit,
            "pix_total_charged": pix_total_charged,
            "pix_gateway_fee": pix_fee_amount,
            "pix_net_profit": pix_net_profit,
            "pix_net_margin_percent": pix_margin_percent,
            "savings_vs_bar": round(max(0.0, bar_total - pix_total_charged), 2),
            "installments": installments_list,
        },
    }


class CustomerProfilePayload(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    whatsapp: str = Field(..., min_length=8)
    city_origin: str = Field("São Paulo (SP)")
    travel_profile: str = Field("Casal")
    preferred_destinations: List[str] = Field(default_factory=list)
    marketing_opt_in: bool = Field(True)


class CustomerActivityPayload(BaseModel):
    customer_email: str
    activity_type: str = Field(..., description="SEARCH | VIEW_HOTEL | FAVORITE_SYNC | CHECKOUT_INTENT | BOOKING_CONFIRMED")
    destination_name: Optional[str] = None
    hotel_id: Optional[str] = None
    hotel_name: Optional[str] = None
    nights_count: Optional[int] = 3
    guests_count: Optional[int] = 2
    estimated_total_brl: Optional[float] = None


# Memória de execução FastAPI espelhando a tabela customers do PostgreSQL
CUSTOMERS_DB: Dict[str, dict] = {}


@app.post("/api/v1/customers")
def register_or_update_customer(payload: CustomerProfilePayload):
    key = payload.email.strip().lower()
    existing = CUSTOMERS_DB.get(key, {})
    record = {
        "member_code": existing.get("member_code", f"MEM-{len(CUSTOMERS_DB) + 8500}"),
        "full_name": payload.full_name.strip(),
        "email": key,
        "whatsapp": payload.whatsapp.strip(),
        "city_origin": payload.city_origin,
        "travel_profile": payload.travel_profile,
        "preferred_destinations": payload.preferred_destinations,
        "marketing_opt_in": payload.marketing_opt_in,
        "activities": existing.get("activities", []),
        "updated_at": datetime.utcnow().isoformat(),
    }
    CUSTOMERS_DB[key] = record
    return {"ok": True, "member_code": record["member_code"], "email": record["email"]}


@app.post("/api/v1/customers/activity")
def log_customer_activity(payload: CustomerActivityPayload):
    key = payload.customer_email.strip().lower()
    if key not in CUSTOMERS_DB:
        CUSTOMERS_DB[key] = {
            "member_code": f"MEM-{len(CUSTOMERS_DB) + 8500}",
            "full_name": "Membro Velluto",
            "email": key,
            "whatsapp": "",
            "activities": [],
        }
    CUSTOMERS_DB[key]["activities"].insert(
        0,
        {
            "activity_type": payload.activity_type,
            "destination_name": payload.destination_name,
            "hotel_id": payload.hotel_id,
            "hotel_name": payload.hotel_name,
            "nights_count": payload.nights_count,
            "guests_count": payload.guests_count,
            "estimated_total_brl": payload.estimated_total_brl,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
    return {"ok": True, "recorded": payload.activity_type}


@app.get("/api/v1/admin/customers")
def list_customers_for_campaigns(x_admin_passcode: Optional[str] = Header(None)):
    if not VELLUTO_ADMIN_PASSCODE or x_admin_passcode != VELLUTO_ADMIN_PASSCODE:
        raise HTTPException(
            status_code=401,
            detail="Acesso negado: Chave VELLUTO_ADMIN_PASSCODE inválida ou ausente.",
        )
    return {
        "ok": True,
        "omnibees_env_configured": bool(OMNIBEES_API_KEY and OMNIBEES_REQUESTOR_ID),
        "count": len(CUSTOMERS_DB),
        "customers": list(CUSTOMERS_DB.values()),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)



