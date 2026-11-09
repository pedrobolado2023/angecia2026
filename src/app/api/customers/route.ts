import { NextRequest, NextResponse } from "next/server";
import { getServerOmnibeesConfig } from "@/lib/serverEnv";
import {
  readCRMDatabase,
  upsertCustomerProfile,
  CustomerCRMRecord,
} from "@/lib/customerStore";

export async function GET(request: NextRequest) {
  const cfg = getServerOmnibeesConfig();
  const cookieToken = request.cookies.get("velluto_admin_session")?.value;
  const headerToken = request.headers.get("x-velluto-admin-token");

  const isAuthenticated =
    Boolean(cfg.adminSessionSecret) &&
    (cookieToken === cfg.adminSessionSecret ||
      headerToken === cfg.adminSessionSecret);

  if (!isAuthenticated) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Acesso negado (HTTP 401). A base de clientes é protegida no Backend e exige sessão de Administrador autenticada.",
      },
      { status: 401 }
    );
  }

  const db = readCRMDatabase();
  const totalCustomers = db.customers.length;
  const optInWhatsappCount = db.customers.filter((c) => c.marketingOptIn).length;
  const abandonedCartsCount = db.customers.filter(
    (c) => c.checkoutIntents.some((i) => !i.converted) && c.bookings.length === 0
  ).length;
  const totalBookingsCount = db.customers.reduce(
    (acc, c) => acc + c.bookings.length,
    0
  );
  const totalRevenueBRL = db.customers.reduce(
    (acc, c) =>
      acc + c.bookings.reduce((sum, b) => sum + Number(b.totalPaid || 0), 0),
    0
  );

  return NextResponse.json({
    ok: true,
    updatedAt: db.updatedAt,
    metrics: {
      totalCustomers,
      optInWhatsappCount,
      abandonedCartsCount,
      totalBookingsCount,
      totalRevenueBRL,
    },
    customers: db.customers,
    campaigns: db.campaigns,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      fullName = "",
      email = "",
      whatsapp = "",
      cityOrigin = "São Paulo (SP)",
      preferredDestinations = [],
      travelProfile = "Casal",
      authMethod = "Cadastro Clube",
      marketingOptIn = true,
      favoriteHotelIds,
      favoriteHotelNames,
    } = body;

    if (!fullName.trim() || !email.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informe seu nome completo e e-mail para ativar seu cadastro de membro.",
        },
        { status: 400 }
      );
    }

    const savedCustomer = upsertCustomerProfile({
      id,
      fullName,
      email,
      whatsapp,
      cityOrigin,
      preferredDestinations: Array.isArray(preferredDestinations)
        ? preferredDestinations
        : [],
      travelProfile:
        travelProfile === "Família" || travelProfile === "Villas & Grupos"
          ? travelProfile
          : "Casal",
      authMethod: authMethod as CustomerCRMRecord["authMethod"],
      marketingOptIn: Boolean(marketingOptIn),
      favoriteHotelIds: Array.isArray(favoriteHotelIds)
        ? favoriteHotelIds
        : undefined,
      favoriteHotelNames: Array.isArray(favoriteHotelNames)
        ? favoriteHotelNames
        : undefined,
    });

    // Retorna para o cliente apenas os dados do próprio perfil (sem expor outros membros)
    return NextResponse.json({
      ok: true,
      memberProfile: {
        id: savedCustomer.id,
        fullName: savedCustomer.fullName,
        email: savedCustomer.email,
        whatsapp: savedCustomer.whatsapp,
        cityOrigin: savedCustomer.cityOrigin,
        preferredDestinations: savedCustomer.preferredDestinations,
        travelProfile: savedCustomer.travelProfile,
        marketingOptIn: savedCustomer.marketingOptIn,
        favoriteHotelIds: savedCustomer.favoriteHotelIds,
        createdAt: savedCustomer.createdAt,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro ao salvar cadastro de cliente no backend." },
      { status: 400 }
    );
  }
}

