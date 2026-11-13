"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CuratedHotel, DESTINATION_CITIES } from "@/data/vellutoCatalog";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import {
  KeyRound,
  Server,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Sliders,
  ShieldCheck,
  Code2,
  BookOpen,
  Wifi,
  AlertCircle,
  Building2,
  ArrowUpRight,
  Users,
  Lock,
  LogOut,
  Download,
  Send,
  Search,
  Heart,
  ShoppingBag,
  Sparkles,
  Calculator,
  Award,
  MessageSquare,
} from "lucide-react";

interface AdminOmnibeesPanelProps {
  hotels: CuratedHotel[];
  onUpdateHotel: (
    hotelId: string,
    updates: {
      netRate: number;
      barRate: number;
      omnibeesAvailableRooms: number;
      stopSell: boolean;
      omnibeesChannelCode?: string;
    }
  ) => void;
  onAddHotel: (newHotel: CuratedHotel) => void;
  onOpenHotelPreview: (hotel: CuratedHotel) => void;
  onOpenExtranetModal: () => void;
  onOpenPricingSimulator: () => void;
  onOpenGovernanceModal: () => void;
  onExitAdmin: () => void;
}

interface MaskedEnvVariable {
  envName: string;
  configured: boolean;
  maskedValue: string;
  scope: string;
}

interface MaskedEnvSummary {
  environment: "sandbox" | "production";
  endpointUrl: string;
  requestorIdMasked: string;
  usernameMasked: string;
  apiKeyMasked: string;
  webhookSecretMasked: string;
  paymentGatewayProvider: string;
  paymentGatewayApiKeyMasked: string;
  paymentWebhookSecretMasked: string;
  ratePlanNetCode: string;
  ratePlanBarCode: string;
  envVariablesStatus: MaskedEnvVariable[];
}

interface CustomerCRMRecordClient {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  cityOrigin: string;
  preferredDestinations: string[];
  travelProfile: string;
  authMethod: string;
  marketingOptIn: boolean;
  lgpdConsentTimestamp: string;
  createdAt: string;
  lastActiveAt: string;
  favoriteHotelIds: string[];
  favoriteHotelNames: string[];
  searchHistory: {
    query: string;
    destinationName: string;
    checkInDate: string;
    nights: number;
    guests: number;
    timestamp: string;
  }[];
  viewedHotels: {
    hotelId: string;
    hotelName: string;
    cityName: string;
    stateCode: string;
    timestamp: string;
  }[];
  checkoutIntents: {
    hotelId: string;
    hotelName: string;
    roomName: string;
    paymentMethod: "PIX" | "CARD";
    estimatedTotal: number;
    nights: number;
    checkInDate: string;
    converted: boolean;
    timestamp: string;
  }[];
  bookings: {
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
  }[];
  campaignTags: string[];
}

interface CampaignRecordClient {
  id: string;
  title: string;
  channel: string;
  segmentFilter: string;
  discountOffer: string;
  destinationFocus: string;
  messageTemplate: string;
  recipientsCount: number;
  createdAt: string;
}

export function AdminOmnibeesPanel({
  hotels,
  onUpdateHotel,
  onAddHotel,
  onOpenHotelPreview,
  onOpenExtranetModal,
  onOpenPricingSimulator,
  onOpenGovernanceModal,
  onExitAdmin,
}: AdminOmnibeesPanelProps) {
  // Autenticação Server-Side (.env.local)
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [maskedEnv, setMaskedEnv] = useState<MaskedEnvSummary | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<
    "crm" | "credentials" | "hotels" | "roadmap"
  >("crm");

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Estado do CRM de Clientes & Campanhas (carregado do Backend /api/customers)
  const [isLoadingCRM, setIsLoadingCRM] = useState<boolean>(false);
  const [customersList, setCustomersList] = useState<CustomerCRMRecordClient[]>([]);
  const [campaignsList, setCampaignsList] = useState<CampaignRecordClient[]>([]);
  const [crmMetrics, setCrmMetrics] = useState({
    totalCustomers: 0,
    optInWhatsappCount: 0,
    abandonedCartsCount: 0,
    totalBookingsCount: 0,
    totalRevenueBRL: 0,
  });
  const [crmSegmentFilter, setCrmSegmentFilter] = useState<
    "all" | "optin" | "abandoned" | "booked" | "nordeste" | "serra"
  >("all");
  const [crmSearchQuery, setCrmSearchQuery] = useState<string>("");

  // Estado para Nova Campanha de Membros
  const [campaignTitle, setCampaignTitle] = useState<string>(
    "Tarifa Secreta Fim de Semana: Até 28% OFF no PIX"
  );
  const [campaignChannel, setCampaignChannel] = useState<
    "WhatsApp VIP" | "E-mail Editorial" | "Push + WhatsApp"
  >("WhatsApp VIP");
  const [campaignDestination, setCampaignDestination] = useState<string>(
    "Maceió, Maragogi, Trancoso & Rio de Janeiro"
  );
  const [campaignMessage, setCampaignMessage] = useState<string>(
    "Olá {nome}! Como membro do Hóspede Club, você tem acesso antecipado ao nosso lote exclusivo com até 28% OFF abaixo da tarifa oficial pagando no PIX."
  );

  // Estado do teste de conexão com /api/omnibees (lendo process.env no servidor)
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    timestamp?: string;
    latencyMs?: number;
    otaMessage?: string;
    environment?: string;
    endpointUrl?: string;
    requestorIdMasked?: string;
    authenticatedUserMasked?: string;
    sampleHotelSynced?: {
      hotelCode: string;
      hotelName: string;
      netRateReceived: number;
      barRateReceived: number;
      availableRooms: number;
    };
    error?: string;
  } | null>(null);

  // Estado do teste de Webhook ARI Push (/api/webhooks/omnibees-ari)
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    ok: boolean;
    otaResponse?: string;
    processedInMs?: number;
    echoToken?: string;
    error?: string;
  } | null>(null);

  // Estado do teste de conexão Hotelbeds APItude (/api/hotelbeds/status)
  const [isTestingHotelbeds, setIsTestingHotelbeds] = useState<boolean>(false);
  const [hotelbedsTestResult, setHotelbedsTestResult] = useState<{
    ok: boolean;
    isSimulation?: boolean;
    environment?: string;
    status?: string;
    latencyMs?: number;
    message?: string;
    apiKeyMasked?: string;
    error?: string;
  } | null>(null);

  // Estado para sincronização em lote dos hotéis
  const [syncingHotelId, setSyncingHotelId] = useState<string | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(
    "Sincronizado via Backend"
  );

  // Estado para adicionar novo hotel via código Omnibees
  const [showNewHotelForm, setShowNewHotelForm] = useState<boolean>(false);
  const [newHotelCode, setNewHotelCode] = useState<string>("OMNI-BA-6080");
  const [newHotelName, setNewHotelName] = useState<string>("");
  const [newHotelCityId, setNewHotelCityId] = useState<string>(
    DESTINATION_CITIES[0].id
  );
  const [newHotelNeighborhood, setNewHotelNeighborhood] =
    useState<string>("Beira-Mar");
  const [newHotelNetRate, setNewHotelNetRate] = useState<number>(1800);
  const [newHotelBarRate, setNewHotelBarRate] = useState<number>(2650);
  const [newHotelAllotment, setNewHotelAllotment] = useState<number>(3);

  const fetchCustomersCRM = useCallback(async () => {
    setIsLoadingCRM(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.ok) {
        setCustomersList(data.customers || []);
        setCampaignsList(data.campaigns || []);
        if (data.metrics) setCrmMetrics(data.metrics);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCRM(false);
    }
  }, []);

  useEffect(() => {
    // Limpa qualquer resquício antigo de credenciais no localStorage por segurança
    try {
      localStorage.removeItem("velluto_omnibees_credentials_v1");
    } catch {
      // ignore
    }

    const checkSession = async () => {
      setIsCheckingAuth(true);
      try {
        const res = await fetch("/api/admin/auth");
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setMaskedEnv(data.maskedEnv);
          fetchCustomersCRM();
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkSession();
  }, [fetchCustomersCRM]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setAuthError(
          data.error || "Chave de acesso inválida. Verifique o .env.local."
        );
        return;
      }
      setIsAuthenticated(true);
      setMaskedEnv(data.maskedEnv);
      setPasscodeInput("");
      fetchCustomersCRM();
    } catch {
      setAuthError("Erro ao conectar com o servidor de autenticação.");
    }
  };

  const handleLogoutAdmin = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setIsAuthenticated(false);
    setMaskedEnv(null);
    onExitAdmin();
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2200);
  };

  const handleTestOmnibeesConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch("/api/omnibees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testHotelCode: hotels[0]?.omnibeesChannelCode || "OMNI-RJ-4401",
        }),
      });
      const data = await res.json();
      setConnectionResult(data);
    } catch {
      setConnectionResult({
        ok: false,
        error: "Erro ao comunicar com o middleware interno /api/omnibees.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestWebhookPush = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch("/api/webhooks/omnibees-ari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalServerTest: true,
          messageType: "OTA_HotelRateAmountNotifRQ",
          hotelCode: hotels[0]?.omnibeesChannelCode || "OMNI-RJ-4401",
          newNetRate: hotels[0]?.netRate || 1630,
          newBarRate: hotels[0]?.barRate || 2400,
          newAvailableRooms: hotels[0]?.omnibeesAvailableRooms || 2,
        }),
      });
      const data = await res.json();
      setWebhookTestResult(data);
    } catch {
      setWebhookTestResult({
        ok: false,
        error: "Falha ao testar endpoint /api/webhooks/omnibees-ari.",
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleTestHotelbedsConnection = async () => {
    setIsTestingHotelbeds(true);
    setHotelbedsTestResult(null);
    try {
      const res = await fetch("/api/hotelbeds/status");
      const data = await res.json();
      setHotelbedsTestResult(data);
    } catch {
      setHotelbedsTestResult({
        ok: false,
        error: "Falha ao conectar com o endpoint interno /api/hotelbeds/status.",
      });
    } finally {
      setIsTestingHotelbeds(false);
    }
  };

  const handleSyncSingleHotel = (hotelId: string) => {
    setSyncingHotelId(hotelId);
    setTimeout(() => {
      setSyncingHotelId(null);
      const now = new Date().toLocaleTimeString("pt-BR");
      setLastSyncTimestamp(`Hoje às ${now}`);
      setSavedBanner(
        `Sincronização ARI (OTA_HotelAvailRS) concluída no servidor para o hotel ${hotelId}.`
      );
      setTimeout(() => setSavedBanner(null), 3500);
    }, 450);
  };

  const handleCreateNewOmnibeesHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim() || !newHotelCode.trim()) return;

    const cityObj =
      DESTINATION_CITIES.find((c) => c.id === newHotelCityId) ||
      DESTINATION_CITIES[0];

    const createdHotel: CuratedHotel = {
      id: `omni-custom-${Date.now()}`,
      name: newHotelName.trim(),
      subtitle: `Propriedade 5 estrelas homologada na curadoria Hóspede Club`,
      clusterId: cityObj.clusterId,
      cityId: cityObj.id,
      cityName: cityObj.shortName,
      stateCode: cityObj.stateCode,
      neighborhood: newHotelNeighborhood.trim() || "Localização Nobre",
      accommodationType: "hotel",
      stars: 5,
      ratingScore: 9.8,
      reviewsCount: 120,
      heroImage: cityObj.heroImage,
      gallery: [cityObj.heroImage],
      primaryLandmarkDistance: `Próximo a ${
        cityObj.landmarks[0]?.name || "Centro Histórico"
      }`,
      landmarkDistances: cityObj.landmarks.slice(0, 2).map((lm) => ({
        landmarkId: lm.id,
        landmarkName: lm.name,
        distanceText: lm.coordinatesLabel,
        walkOrDrive: "walk" as const,
      })),
      omnibeesChannelCode: newHotelCode.trim(),
      omnibeesAvailableRooms: newHotelAllotment,
      stopSell: newHotelAllotment <= 0,
      scarcityLabel:
        newHotelAllotment <= 0
          ? "Esgotado • Stop Sell Ativo"
          : `Apenas ${newHotelAllotment} suítes restantes nesta tarifa`,
      liveViewersCount: 9,
      lastBookingNotice: "Última reserva há 14 min por membro de São Paulo",
      isFlashDeal: true,
      flashDealRemainingSeconds: 8400,
      netRate: newHotelNetRate,
      barRate: newHotelBarRate,
      curationHighlights: [
        "Café da manhã oficial incluso na tarifa de membro",
        "Disponibilidade e reserva instantânea confirmada",
      ],
      rooms: [
        {
          id: `room-master-${Date.now()}`,
          name: "Suíte Master Luxury",
          sizeM2: 58,
          viewLabel: "Vista Panorâmica",
          bedConfig: "1 Cama King Size",
          omnibeesAvailableCount: newHotelAllotment,
          minStay: 2,
          netRate: newHotelNetRate,
          barRate: newHotelBarRate,
          boardBasis: "Café da Manhã Incluso",
          highlights: [
            "Varanda Privativa",
            "Enxoval 600 fios",
            "Máquina Nespresso",
          ],
        },
      ],
    };

    onAddHotel(createdHotel);
    setNewHotelName("");
    setShowNewHotelForm(false);
    setSavedBanner(
      `Propriedade "${createdHotel.name}" (${createdHotel.omnibeesChannelCode}) vinculada ao catálogo com sucesso!`
    );
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const filteredCustomers = customersList.filter((c) => {
    if (crmSegmentFilter === "optin" && !c.marketingOptIn) return false;
    if (
      crmSegmentFilter === "abandoned" &&
      !(c.checkoutIntents.some((i) => !i.converted) && c.bookings.length === 0)
    ) {
      return false;
    }
    if (crmSegmentFilter === "booked" && c.bookings.length === 0) return false;
    if (crmSegmentFilter === "nordeste") {
      const text = `${c.preferredDestinations.join(" ")} ${c.searchHistory
        .map((s) => s.destinationName)
        .join(" ")}`.toLowerCase();
      if (
        !text.includes("macei") &&
        !text.includes("maragogi") &&
        !text.includes("trancoso") &&
        !text.includes("porto") &&
        !text.includes("jeri")
      ) {
        return false;
      }
    }
    if (crmSegmentFilter === "serra") {
      const text = `${c.preferredDestinations.join(" ")} ${c.searchHistory
        .map((s) => s.destinationName)
        .join(" ")}`.toLowerCase();
      if (
        !text.includes("gramado") &&
        !text.includes("campos") &&
        !text.includes("vinhedos") &&
        !text.includes("monte verde")
      ) {
        return false;
      }
    }
    if (crmSearchQuery.trim() !== "") {
      const q = crmSearchQuery.trim().toLowerCase();
      const hay =
        `${c.fullName} ${c.email} ${c.whatsapp} ${c.cityOrigin} ${c.preferredDestinations.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) return;
    try {
      const res = await fetch("/api/customers/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "CREATE_CAMPAIGN",
          payload: {
            title: campaignTitle,
            channel: campaignChannel,
            segmentFilter: crmSegmentFilter.toUpperCase(),
            discountOffer: "Até 28% OFF no PIX",
            destinationFocus: campaignDestination,
            messageTemplate: campaignMessage,
            recipientsCount: filteredCustomers.length,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedBanner(
          `Campanha "${campaignTitle}" registrada no Backend para ${filteredCustomers.length} membro(s) qualificado(s)!`
        );
        setTimeout(() => setSavedBanner(null), 4000);
        fetchCustomersCRM();
      }
    } catch {
      // ignore
    }
  };

  const handleExportCustomersCSV = () => {
    const headers = [
      "ID",
      "Nome Completo",
      "Email",
      "WhatsApp",
      "Cidade Origem",
      "Perfil",
      "OptIn Marketing",
      "Destinos Interesse",
      "Hoteis Favoritos",
      "Ultima Busca",
      "Carrinho Abandonado",
      "Total Reservas",
      "Receita Total BRL",
    ];
    const rows = filteredCustomers.map((c) => {
      const totalSpent = c.bookings.reduce((s, b) => s + b.totalPaid, 0);
      const lastSearch = c.searchHistory[0]?.destinationName || "Nenhuma";
      const hasAbandoned = c.checkoutIntents.some((i) => !i.converted)
        ? "SIM"
        : "NAO";
      return [
        c.id,
        `"${c.fullName}"`,
        c.email,
        `"${c.whatsapp}"`,
        `"${c.cityOrigin}"`,
        `"${c.travelProfile}"`,
        c.marketingOptIn ? "SIM" : "NAO",
        `"${c.preferredDestinations.join("; ")}"`,
        `"${c.favoriteHotelNames.join("; ")}"`,
        `"${lastSearch}"`,
        hasAbandoned,
        c.bookings.length,
        totalSpent,
      ].join(",");
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `hospede-clientes-campanha-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  if (isCheckingAuth) {
    return (
      <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-6 h-6 text-[#B8863B] animate-spin mx-auto mb-3" />
        <p className="text-xs text-[#5C646B]">
          Verificando sessão segura no Backend...
        </p>
      </main>
    );
  }

  // TELA DE LOGIN DO ADMINISTRADOR (VALIDAÇÃO SERVER-SIDE CONTRA .env.local)
  if (!isAuthenticated) {
    return (
      <main className="flex-1 max-w-md mx-auto px-4 py-14 w-full">
        <div className="bg-white border border-[#DFD5C5] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="w-11 h-11 rounded-2xl bg-[#0F5257]/10 border border-[#0F5257]/25 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-[#0F5257]" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-medium block">
            Ambiente Protegido por Variável de Ambiente (.env.local)
          </span>
          <h1 className="font-editorial text-3xl text-[#182026] font-normal mt-1">
            Portal Gestor & CRM
          </h1>
          <p className="text-xs text-[#5C646B] mt-2 leading-relaxed">
            As credenciais da Omnibees e a base de clientes são armazenadas
            exclusivamente no servidor. Insira a chave configurada em{" "}
            <code className="px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E2D9C8] text-[#182026]">
              HOSPEDE_ADMIN_PASSCODE
            </code>{" "}
            para acessar.
          </p>

          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1.5">
                Chave de Acesso do Administrador
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Digite a senha do .env.local..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                autoFocus
              />
              <span className="text-[11px] text-[#5C646B] block mt-1.5">
                A senha é validada no servidor a partir da variável{" "}
                <code className="text-[#0F5257] font-medium">
                  HOSPEDE_ADMIN_PASSCODE
                </code>{" "}
                definida no seu arquivo <code>.env.local</code>.
              </span>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-[#B83B2B]/10 border border-[#B83B2B]/30 text-xs text-[#B83B2B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white text-xs font-medium uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                Autenticar no Servidor
              </button>
              <button
                type="button"
                onClick={onExitAdmin}
                className="py-3 px-4 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#5C646B] hover:text-[#182026] cursor-pointer"
              >
                Voltar ao Site
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  const sampleAvailXml = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="HOSPEDE-${Date.now()}"
  Target="${maskedEnv?.environment === "production" ? "Production" : "Test"}"
  Version="2.001"
  PrimaryLangID="pt">
  <POS>
    <Source>
      <!-- Injetado no Backend via process.env.OMNIBEES_REQUESTOR_ID -->
      <RequestorID Type="22" ID="[PROCESS.ENV.OMNIBEES_REQUESTOR_ID]" ID_Context="OMNIBEES">
        <CompanyName Code="[PROCESS.ENV.OMNIBEES_USERNAME]" />
      </RequestorID>
    </Source>
  </POS>
  <AvailRequestSegments>
    <AvailRequestSegment>
      <HotelSearchCriteria>
        <Criterion>
          <HotelRef HotelCode="${hotels[0]?.omnibeesChannelCode || "OMNI-RJ-4401"}" />
          <StayDateRange Start="2026-11-13" End="2026-11-16" />
          <RatePlanCandidates>
            <RatePlanCandidate RatePlanCode="${maskedEnv?.ratePlanNetCode || "RATE_NET_CLUB"}" />
            <RatePlanCandidate RatePlanCode="${maskedEnv?.ratePlanBarCode || "RATE_BAR_PUBLIC"}" />
          </RatePlanCandidates>
        </Criterion>
      </HotelSearchCriteria>
    </AvailRequestSegment>
  </AvailRequestSegments>
</OTA_HotelAvailRQ>`;

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 w-full">
      {/* CABEÇALHO DO PAINEL DE ADMINISTRADOR PROTEGIDO */}
      <div className="bg-white border border-[#E5DEC9] rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F5257]/10 border border-[#0F5257]/20 text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F5257]" />
              <span>
                Sessão Admin Autenticada • Credenciais Blindadas em .env.local
              </span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#182026]">
              Portal Gestor: CRM de Membros & Conexão Omnibees
            </h1>
            <p className="text-xs sm:text-sm text-[#5C646B] mt-2 max-w-3xl leading-relaxed">
              Gerencie toda a base de clientes, histórico de buscas, favoritos,
              carrinhos e reservas salvas no Backend para suas campanhas de
              membros, além da conectividade Omnibees protegida por variáveis de
              ambiente.
            </p>
          </div>

          {/* Ferramentas Internas (Extranet, Simulador Net+15%, Governança e Logout) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenPricingSimulator}
              className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#B8863B] text-xs text-[#182026] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-[#B8863B]" />
              <span>Simulador Net + 15%</span>
            </button>
            <button
              onClick={onOpenExtranetModal}
              className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#B8863B] text-xs text-[#182026] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#B8863B]" />
              <span>Extranet Lotes</span>
            </button>
            <button
              onClick={onOpenGovernanceModal}
              className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#0F5257] text-xs text-[#0F5257] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#0F5257]" />
              <span>Governança</span>
            </button>
            <button
              onClick={handleLogoutAdmin}
              className="px-3.5 py-2 rounded-xl bg-[#B83B2B]/10 border border-[#B83B2B]/25 text-xs text-[#B83B2B] font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#B83B2B] hover:text-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Bloquear Admin</span>
            </button>
          </div>
        </div>

        {/* SUB-ABAS DO PAINEL DE ADMINISTRAÇÃO */}
        <div className="flex flex-wrap items-center gap-2 mt-7 pt-6 border-t border-[#EAE3D5]">
          <button
            onClick={() => setActiveSubTab("crm")}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
              activeSubTab === "crm"
                ? "bg-[#182026] text-white border-[#182026] shadow-xs"
                : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8] hover:text-[#182026]"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>
              1. CRM de Clientes & Campanhas ({crmMetrics.totalCustomers})
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("credentials")}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
              activeSubTab === "credentials"
                ? "bg-[#182026] text-white border-[#182026] shadow-xs"
                : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8] hover:text-[#182026]"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>2. Variáveis de Ambiente (.env) & Omnibees</span>
          </button>

          <button
            onClick={() => setActiveSubTab("hotels")}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
              activeSubTab === "hotels"
                ? "bg-[#182026] text-white border-[#182026] shadow-xs"
                : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8] hover:text-[#182026]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>3. Hotéis & Códigos Omnibees ({hotels.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("roadmap")}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
              activeSubTab === "roadmap"
                ? "bg-[#182026] text-white border-[#182026] shadow-xs"
                : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8] hover:text-[#182026]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>4. Homologação & XML OTA</span>
          </button>
        </div>
      </div>

      {/* AVISO DE AÇÃO SALVA */}
      {savedBanner && (
        <div className="mb-6 p-4 rounded-xl bg-[#0F5257] text-white text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FFE599] shrink-0" />
            <span>{savedBanner}</span>
          </div>
          <button
            onClick={() => setSavedBanner(null)}
            className="text-[#FFE599] hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =====================================================================
          SUB-ABA 1: CRM DE CLIENTES & CAMPANHAS DE MEMBROS (SALVO NO BACKEND)
         ===================================================================== */}
      {activeSubTab === "crm" && (
        <div className="space-y-6">
          {/* KPIs do CRM de Membros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5DEC9] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block">
                Base Total no Backend
              </span>
              <p className="font-editorial text-3xl text-[#182026] mt-1">
                {crmMetrics.totalCustomers} Membros
              </p>
              <span className="text-[11px] text-[#0F5257] font-medium mt-1 block">
                Salvos em data/customers_crm.json
              </span>
            </div>

            <div className="bg-white border border-[#E5DEC9] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block">
                Opt-in para Campanhas
              </span>
              <p className="font-editorial text-3xl text-[#0F5257] mt-1">
                {crmMetrics.optInWhatsappCount} Ativos
              </p>
              <span className="text-[11px] text-[#5C646B] mt-1 block">
                Autorizados via LGPD (WhatsApp & E-mail)
              </span>
            </div>

            <div className="bg-white border border-[#E5DEC9] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block">
                Carrinhos / Alta Intenção
              </span>
              <p className="font-editorial text-3xl text-[#B83B2B] mt-1">
                {crmMetrics.abandonedCartsCount} Oportunidades
              </p>
              <span className="text-[11px] text-[#5C646B] mt-1 block">
                Iniciaram checkout sem concluir
              </span>
            </div>

            <div className="bg-white border border-[#E5DEC9] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block">
                Reservas Confirmadas
              </span>
              <p className="font-editorial text-3xl text-[#182026] mt-1 tabular-price">
                {formatBRL(crmMetrics.totalRevenueBRL)}
              </p>
              <span className="text-[11px] text-[#0F5257] font-medium mt-1 block">
                {crmMetrics.totalBookingsCount} reserva(s) emitida(s)
              </span>
            </div>
          </div>

          {/* CRIADOR DE CAMPANHAS DE MEMBROS & EXPORTAÇÃO CSV */}
          <div className="bg-white border border-[#E5DEC9] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAE3D5]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                  Motor de Marketing & Retenção VIP
                </span>
                <h2 className="font-editorial text-2xl font-normal text-[#182026] mt-0.5">
                  Criar Campanha de Membros ou Exportar Base
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={fetchCustomersCRM}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026] hover:border-[#B8863B] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#9A6D28] ${
                      isLoadingCRM ? "animate-spin" : ""
                    }`}
                  />
                  <span>Atualizar Base</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCustomersCSV}
                  className="px-4 py-2 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Exportar Clientes Filtrados (.CSV) ({filteredCustomers.length})
                  </span>
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateCampaign}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-5"
            >
              <div className="lg:col-span-5">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                  Título da Campanha de Membros
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                  Canal de Disparo
                </label>
                <select
                  value={campaignChannel}
                  onChange={(e) =>
                    setCampaignChannel(
                      e.target.value as
                        | "WhatsApp VIP"
                        | "E-mail Editorial"
                        | "Push + WhatsApp"
                    )
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                >
                  <option value="WhatsApp VIP">WhatsApp VIP (1-Clique / API)</option>
                  <option value="E-mail Editorial">Newsletter Editorial Luxo</option>
                  <option value="Push + WhatsApp">Push App + WhatsApp</option>
                </select>
              </div>
              <div className="lg:col-span-4">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                  Destinos em Destaque
                </label>
                <input
                  type="text"
                  value={campaignDestination}
                  onChange={(e) => setCampaignDestination(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                />
              </div>
              <div className="lg:col-span-9">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                  Mensagem Personalizada (use {"{nome}"} para personalizar)
                </label>
                <input
                  type="text"
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                />
              </div>
              <div className="lg:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs font-medium uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Salvar & Preparar Disparo</span>
                </button>
              </div>
            </form>

            {campaignsList.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#F0EAE0]">
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#5C646B] font-medium block mb-2">
                  Últimas Campanhas Registradas no Backend ({campaignsList.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {campaignsList.slice(0, 3).map((camp) => (
                    <div
                      key={camp.id}
                      className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B8863B] shrink-0" />
                      <span className="font-medium text-[#182026]">
                        {camp.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F5257]/10 text-[#0F5257]">
                        {camp.channel} • {camp.recipientsCount} membros
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FILTROS DE SEGMENTAÇÃO E TABELA 360° DE CLIENTES */}
          <div className="bg-white border border-[#E5DEC9] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EAE3D5]">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: `Todos (${customersList.length})` },
                  { id: "optin", label: "Opt-in WhatsApp" },
                  { id: "abandoned", label: "Carrinho Abandonado" },
                  { id: "booked", label: "Com Reserva Confirmada" },
                  { id: "nordeste", label: "Interesse: Nordeste" },
                  { id: "serra", label: "Interesse: Serra & Vinhos" },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() =>
                      setCrmSegmentFilter(
                        seg.id as typeof crmSegmentFilter
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer border ${
                      crmSegmentFilter === seg.id
                        ? "bg-[#182026] text-white border-[#182026] font-medium"
                        : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8] hover:text-[#182026]"
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-3.5 h-3.5 text-[#9A6D28] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={crmSearchQuery}
                  onChange={(e) => setCrmSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, cidade..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                />
              </div>
            </div>

            {/* LISTA DETALHADA 360° DE CADA CLIENTE */}
            <div className="divide-y divide-[#EAE3D5] mt-2">
              {filteredCustomers.map((customer) => {
                const lastViewedHotel =
                  customer.viewedHotels[0]?.hotelName ||
                  customer.favoriteHotelNames[0] ||
                  customer.preferredDestinations[0] ||
                  "nossa coleção privada";
                const personalizedWaText = campaignMessage
                  .replace("{nome}", customer.fullName.split(" ")[0])
                  .concat(` Vimos seu interesse em ${lastViewedHotel}.`);
                const cleanPhone = customer.whatsapp.replace(/\D/g, "");

                return (
                  <div
                    key={customer.id}
                    className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
                  >
                    {/* Coluna 1: Dados Cadastrais & Contato */}
                    <div className="lg:col-span-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F3EDE2] text-[#9A6D28] font-medium">
                          {customer.id}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F5257]/10 text-[#0F5257] font-medium">
                          {customer.authMethod}
                        </span>
                        {customer.marketingOptIn && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            LGPD Opt-in
                          </span>
                        )}
                      </div>
                      <h3 className="font-editorial text-2xl text-[#182026] font-normal mt-1">
                        {customer.fullName}
                      </h3>
                      <p className="text-xs text-[#5C646B] mt-0.5">
                        {customer.email} •{" "}
                        <strong className="text-[#182026]">
                          {customer.whatsapp}
                        </strong>
                      </p>
                      <p className="text-[11px] text-[#9A6D28] mt-1">
                        Origem: {customer.cityOrigin} • Perfil:{" "}
                        {customer.travelProfile}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {customer.campaignTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E2D9C8] text-[#465058]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Coluna 2: Comportamento Rastreável (Buscas, Favoritos & Hotéis Vistos) */}
                    <div className="lg:col-span-5 space-y-2 text-xs bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EAE3D5]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium block">
                          Destinos & Buscas Recentes ({customer.searchHistory.length})
                        </span>
                        {customer.searchHistory.length > 0 ? (
                          <p className="text-xs text-[#182026] mt-0.5">
                            Última busca:{" "}
                            <strong>
                              {customer.searchHistory[0].destinationName ||
                                customer.searchHistory[0].query}
                            </strong>{" "}
                            ({customer.searchHistory[0].nights} noites •{" "}
                            {customer.searchHistory[0].guests} hóspedes • Check-in{" "}
                            {customer.searchHistory[0].checkInDate})
                          </p>
                        ) : (
                          <p className="text-xs text-[#5C646B] mt-0.5">
                            Interesses: {customer.preferredDestinations.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#EAE3D5] flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#5C646B]">
                          <Heart className="w-3 h-3 text-[#B83B2B]" />
                          <span>
                            Favoritos:{" "}
                            <strong className="text-[#182026]">
                              {customer.favoriteHotelNames.length > 0
                                ? customer.favoriteHotelNames.join(", ")
                                : "Nenhum salvo"}
                            </strong>
                          </span>
                        </span>
                      </div>

                      {customer.checkoutIntents.length > 0 && (
                        <div className="pt-2 border-t border-[#EAE3D5]">
                          <span className="text-[11px] text-[#B83B2B] font-medium flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            <span>
                              Checkout Iniciado:{" "}
                              {customer.checkoutIntents[0].hotelName} (
                              {formatBRL(
                                customer.checkoutIntents[0].estimatedTotal
                              )}{" "}
                              via {customer.checkoutIntents[0].paymentMethod})
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Coluna 3: Reservas Confirmadas & Ação de Campanha 1-Clique */}
                    <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                      <div className="p-3 rounded-xl bg-white border border-[#EAE3D5]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5C646B] block">
                          Histórico de Reservas ({customer.bookings.length})
                        </span>
                        {customer.bookings.length > 0 ? (
                          <div className="mt-1">
                            <span className="text-sm font-semibold text-[#0F5257] block tabular-price">
                              {formatBRL(
                                customer.bookings.reduce(
                                  (s, b) => s + b.totalPaid,
                                  0
                                )
                              )}{" "}
                              acumulados
                            </span>
                            <span className="text-[11px] text-[#5C646B] block truncate">
                              Última: {customer.bookings[0].hotelName} (
                              {customer.bookings[0].voucherCode})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9A6D28] font-medium block mt-1">
                            Potencial para 1ª Reserva VIP
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            personalizedWaText
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Enviar Campanha WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(personalizedWaText, `wa-${customer.id}`)
                          }
                          className="w-full py-1.5 px-3 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-[11px] text-[#182026] hover:border-[#B8863B] inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {copiedField === `wa-${customer.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-[#0F5257]" />
                              <span>Texto Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#9A6D28]" />
                              <span>Copiar Mensagem VIP</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-ABA 2: VARIÁVEIS DE AMBIENTE (.ENV) & DIAGNÓSTICO OMNIBEES
         ===================================================================== */}
      {activeSubTab === "credentials" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white border border-[#E5DEC9] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EAE3D5] mb-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-medium block">
                  Segurança Zero-Leak • Backend Only
                </span>
                <h2 className="font-editorial text-2xl font-normal text-[#182026] mt-0.5">
                  Variáveis de Ambiente no Servidor (.env.local)
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#0F5257]/10 text-[#0F5257] text-[11px] font-medium">
                0 Chaves no Navegador
              </span>
            </div>

            <p className="text-xs text-[#5C646B] mb-5 leading-relaxed">
              Por segurança, nenhuma senha, token ou chave de API é armazenada no
              navegador ou exposta no código público. Todas as credenciais abaixo
              são lidas diretamente de{" "}
              <code className="px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E2D9C8] text-[#182026]">
                process.env
              </code>{" "}
              no servidor e exibidas com máscara criptográfica:
            </p>

            <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#EAE3D5] text-[10px] uppercase tracking-wider text-[#9A6D28]">
                    <th className="py-3 px-3.5">Canal / Integração</th>
                    <th className="py-3 px-3.5">Variável (.env)</th>
                    <th className="py-3 px-3.5">Valor Mascarado</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0]">
                  {maskedEnv?.envVariablesStatus.map((item) => (
                    <tr key={item.envName} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-2.5 px-3.5 text-[11px] text-[#9A6D28] font-medium">
                        {item.scope}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#182026] font-medium">
                        {item.envName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#5C646B]">
                        {item.maskedValue}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {item.configured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F5257]/10 text-[#0F5257] text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Configurada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B8863B]/15 text-[#9A6D28] text-[10px] font-medium">
                            <span>Pendente no .env</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-5 border-t border-[#EAE3D5] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestOmnibeesConnection}
                disabled={isTestingConnection}
                className="py-3 px-5 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white text-xs font-medium uppercase tracking-[0.12em] transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isTestingConnection ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isTestingConnection
                    ? "Testando Pull API via .env..."
                    : "Testar Pull API Omnibees (Usando .env)"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestWebhookPush}
                disabled={isTestingWebhook}
                className="py-3 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs font-medium uppercase tracking-[0.12em] transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Wifi className="w-4 h-4" />
                <span>
                  {isTestingWebhook
                    ? "Validando Push ARI..."
                    : "Testar Webhook Push ARI (Usando .env)"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestHotelbedsConnection}
                disabled={isTestingHotelbeds}
                className="py-3 px-5 rounded-xl bg-[#182026] hover:bg-[#2C3842] text-white text-xs font-medium uppercase tracking-[0.12em] transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Server
                  className={`w-4 h-4 text-[#B8863B] ${
                    isTestingHotelbeds ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isTestingHotelbeds
                    ? "Validando Hotelbeds APItude..."
                    : "Testar Hotelbeds APItude (Status & SHA-256)"}
                </span>
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA: RESULTADOS DE DIAGNÓSTICO DO SERVIDOR */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E5DEC9] rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium">
                  Diagnóstico dos Canais Hoteleiros
                </span>
                <Wifi className="w-4 h-4 text-[#0F5257]" />
              </div>
              <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                Conectores Hotelbeds & Omnibees
              </h3>

              {!connectionResult && !webhookTestResult && !hotelbedsTestResult ? (
                <div className="mt-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs text-[#5C646B] leading-relaxed">
                  Clique em <strong>&ldquo;Testar Hotelbeds APItude&rdquo;</strong>{" "}
                  ou <strong>&ldquo;Testar Pull API Omnibees&rdquo;</strong> ao
                  lado para disparar o teste diretamente pelo Backend lendo as
                  chaves do arquivo <code>.env.local</code> / Easypanel.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {hotelbedsTestResult && (
                    <div
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        hotelbedsTestResult.ok
                          ? "bg-[#FAF7F2] border-[#0F5257]/40 text-[#182026]"
                          : "bg-[#B83B2B]/10 border-[#B83B2B]/30 text-[#B83B2B]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[#0F5257] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hotelbeds APItude: {hotelbedsTestResult.status}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#182026] text-white text-[10px]">
                          {hotelbedsTestResult.latencyMs} ms
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C646B] leading-relaxed">
                        {hotelbedsTestResult.message || hotelbedsTestResult.error}
                      </p>
                      <p className="text-[10px] text-[#9A6D28]">
                        Ambiente: <strong>{hotelbedsTestResult.environment}</strong> • API Key:{" "}
                        <code>{hotelbedsTestResult.apiKeyMasked}</code>
                      </p>
                    </div>
                  )}
                  {connectionResult && (
                    <div
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        connectionResult.ok
                          ? "bg-[#FAF7F2] border-[#0F5257]/40 text-[#182026]"
                          : "bg-[#B83B2B]/10 border-[#B83B2B]/30 text-[#B83B2B]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[#0F5257]">
                          Pull API: {connectionResult.otaMessage}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#0F5257] text-white text-[10px]">
                          {connectionResult.latencyMs} ms
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C646B]">
                        RequestorID:{" "}
                        <strong>{connectionResult.requestorIdMasked}</strong> •
                        Usuário:{" "}
                        <strong>
                          {connectionResult.authenticatedUserMasked}
                        </strong>
                      </p>
                      {connectionResult.sampleHotelSynced && (
                        <p className="text-[11px] text-[#0F5257] font-medium">
                          Hotel Sincronizado:{" "}
                          {connectionResult.sampleHotelSynced.hotelName} (
                          {connectionResult.sampleHotelSynced.hotelCode})
                        </p>
                      )}
                    </div>
                  )}

                  {webhookTestResult && (
                    <div
                      className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                        webhookTestResult.ok
                          ? "bg-[#FAF7F2] border-[#B8863B]/50 text-[#182026]"
                          : "bg-[#B83B2B]/10 border-[#B83B2B]/30 text-[#B83B2B]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[#9A6D28]">
                          Push Webhook: {webhookTestResult.otaResponse}
                        </span>
                        <span className="text-[10px] text-[#0F5257] font-semibold">
                          HMAC .env Verificado
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C646B]">
                        EchoToken: {webhookTestResult.echoToken} (
                        {webhookTestResult.processedInMs} ms)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-ABA 3: HOTÉIS CONECTADOS & MAPEAMENTO HOTELCODE OMNIBEES
         ===================================================================== */}
      {activeSubTab === "hotels" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5DEC9] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                Mapeamento de Inventário ARI (Availability, Rates & Inventory)
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026] mt-0.5">
                Propriedades Vinculadas à Omnibees ({hotels.length})
              </h2>
              <p className="text-xs text-[#5C646B] mt-1">
                Última sincronização com o barramento Omnibees:{" "}
                <strong className="text-[#0F5257]">{lastSyncTimestamp}</strong>
              </p>
            </div>

            <button
              onClick={() => setShowNewHotelForm(!showNewHotelForm)}
              className="self-start sm:self-auto py-2.5 px-4 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs font-medium uppercase tracking-[0.12em] transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Novo Hotel Omnibees</span>
            </button>
          </div>

          {showNewHotelForm && (
            <form
              onSubmit={handleCreateNewOmnibeesHotel}
              className="bg-[#FAF7F2] border-2 border-[#B8863B] rounded-2xl p-6 shadow-md space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#E2D9C8] pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                    Onboarding de Propriedade via Pull API
                  </span>
                  <h3 className="font-editorial text-2xl text-[#182026] font-normal">
                    Cadastrar Novo Hotel pelo HotelCode Omnibees
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewHotelForm(false)}
                  className="text-xs text-[#5C646B] hover:text-[#182026] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    HotelCode Omnibees
                  </label>
                  <input
                    type="text"
                    value={newHotelCode}
                    onChange={(e) => setNewHotelCode(e.target.value)}
                    placeholder="OMNI-BA-6080"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D9C8] text-xs font-mono text-[#182026]"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Nome do Hotel / Resort
                  </label>
                  <input
                    type="text"
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    placeholder="Ex: Txai Resort Itacaré"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Destino / Rota
                  </label>
                  <select
                    value={newHotelCityId}
                    onChange={(e) => setNewHotelCityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                  >
                    {DESTINATION_CITIES.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.shortName} ({city.stateCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Tarifa Net (R$)
                  </label>
                  <input
                    type="number"
                    min={200}
                    value={newHotelNetRate}
                    onChange={(e) => setNewHotelNetRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Tarifa BAR (R$)
                  </label>
                  <input
                    type="number"
                    min={300}
                    value={newHotelBarRate}
                    onChange={(e) => setNewHotelBarRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E2D9C8]">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <label className="text-[#5C646B] mr-2">Bairro/Praia:</label>
                    <input
                      type="text"
                      value={newHotelNeighborhood}
                      onChange={(e) => setNewHotelNeighborhood(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                    />
                  </div>
                  <div>
                    <label className="text-[#5C646B] mr-2">
                      Lote Inicial (Quartos):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newHotelAllotment}
                      onChange={(e) =>
                        setNewHotelAllotment(Number(e.target.value))
                      }
                      className="w-16 px-2.5 py-1 rounded-lg bg-white border border-[#E2D9C8] text-xs text-[#182026]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white text-xs font-medium uppercase tracking-[0.12em] transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Importar e Publicar no Catálogo</span>
                </button>
              </div>
            </form>
          )}

          {/* TABELA DE HOTÉIS MAPEADOS */}
          <div className="bg-white border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F3EDE2] border-b border-[#E5DEC9] text-[10px] uppercase tracking-[0.16em] text-[#9A6D28]">
                    <th className="py-3.5 px-4">Código Omnibees</th>
                    <th className="py-3.5 px-4">Propriedade & Destino</th>
                    <th className="py-3.5 px-4">Tarifa Net (Hotel)</th>
                    <th className="py-3.5 px-4">Tarifa Oficial (BAR)</th>
                    <th className="py-3.5 px-4">Venda PIX (+15% Líq.)</th>
                    <th className="py-3.5 px-4">Allotment ARI</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE3D5] text-xs">
                  {hotels.map((hotel) => {
                    const pricing = calculateVellutoPricing(
                      hotel.netRate,
                      hotel.barRate,
                      0.15,
                      hotel.cleaningFee || 0,
                      hotel.securityDeposit || 0
                    );
                    const isSyncing = syncingHotelId === hotel.id;

                    return (
                      <tr
                        key={hotel.id}
                        className="hover:bg-[#FAF7F2] transition"
                      >
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <input
                            type="text"
                            value={hotel.omnibeesChannelCode}
                            onChange={(e) =>
                              onUpdateHotel(hotel.id, {
                                netRate: hotel.netRate,
                                barRate: hotel.barRate,
                                omnibeesAvailableRooms:
                                  hotel.omnibeesAvailableRooms,
                                stopSell: Boolean(hotel.stopSell),
                                omnibeesChannelCode: e.target.value,
                              })
                            }
                            className="w-32 px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] text-[#0F5257] font-semibold focus:outline-none focus:border-[#B8863B]"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[#182026] block">
                            {hotel.name}
                          </span>
                          <span className="text-[11px] text-[#5C646B]">
                            {hotel.neighborhood} • {hotel.cityName} (
                            {hotel.stateCode})
                          </span>
                        </td>

                        <td className="py-3.5 px-4 tabular-price">
                          <div className="flex items-center gap-1">
                            <span className="text-[#5C646B]">R$</span>
                            <input
                              type="number"
                              min={150}
                              value={hotel.netRate}
                              onChange={(e) => {
                                const val = Math.max(
                                  150,
                                  Number(e.target.value) || 150
                                );
                                onUpdateHotel(hotel.id, {
                                  netRate: val,
                                  barRate: Math.max(val + 100, hotel.barRate),
                                  omnibeesAvailableRooms:
                                    hotel.omnibeesAvailableRooms,
                                  stopSell: Boolean(hotel.stopSell),
                                });
                              }}
                              className="w-20 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] text-[#182026] font-medium"
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-price">
                          <div className="flex items-center gap-1">
                            <span className="text-[#5C646B]">R$</span>
                            <input
                              type="number"
                              min={hotel.netRate + 50}
                              value={hotel.barRate}
                              onChange={(e) => {
                                const val = Math.max(
                                  hotel.netRate + 50,
                                  Number(e.target.value) || hotel.netRate + 50
                                );
                                onUpdateHotel(hotel.id, {
                                  netRate: hotel.netRate,
                                  barRate: val,
                                  omnibeesAvailableRooms:
                                    hotel.omnibeesAvailableRooms,
                                  stopSell: Boolean(hotel.stopSell),
                                });
                              }}
                              className="w-20 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] text-[#5C646B]"
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 tabular-price">
                          <span className="font-semibold text-[#0F5257] block">
                            {formatBRL(pricing.pix.pixPrice)}
                          </span>
                          <span className="text-[10px] text-[#9A6D28]">
                            Lucro Líq.: {formatBRL(pricing.pix.netProfitAmount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={hotel.omnibeesAvailableRooms}
                              onChange={(e) => {
                                const rooms = Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                );
                                onUpdateHotel(hotel.id, {
                                  netRate: hotel.netRate,
                                  barRate: hotel.barRate,
                                  omnibeesAvailableRooms: rooms,
                                  stopSell: rooms === 0,
                                });
                              }}
                              className="w-14 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] text-center font-medium text-[#182026]"
                            />
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                hotel.stopSell ||
                                hotel.omnibeesAvailableRooms <= 0
                                  ? "bg-[#B83B2B]/15 text-[#B83B2B]"
                                  : "bg-[#0F5257]/12 text-[#0F5257]"
                              }`}
                            >
                              {hotel.stopSell ||
                              hotel.omnibeesAvailableRooms <= 0
                                ? "Stop Sell"
                                : "Ativo"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSyncSingleHotel(hotel.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#B8863B] text-[#182026] text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Forçar Pull ARI da Omnibees"
                            >
                              <RefreshCw
                                className={`w-3 h-3 text-[#9A6D28] ${
                                  isSyncing ? "animate-spin" : ""
                                }`}
                              />
                              <span>Sync ARI</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenHotelPreview(hotel)}
                              className="p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#0F5257] text-[#0F5257] cursor-pointer"
                              title="Visualizar Página da Propriedade"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-ABA 4: PASSO A PASSO DE HOMOLOGAÇÃO OMNIBEES & PAYLOADS XML OTA
         ===================================================================== */}
      {activeSubTab === "roadmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white border border-[#E5DEC9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                Arquitetura Segura em Produção
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026] mt-0.5">
                Como Conectar sua Conta Oficial Omnibees
              </h2>
            </div>

            <div className="space-y-4 text-xs text-[#465058]">
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5]">
                <span className="text-[10px] uppercase tracking-widest text-[#0F5257] font-semibold block mb-1">
                  Passo 1 • Credenciais no .env.local do Servidor
                </span>
                <p className="text-sm font-medium text-[#182026]">
                  Adicione suas chaves da Omnibees apenas nas variáveis de
                  ambiente
                </p>
                <p className="mt-1 leading-relaxed">
                  No servidor de produção (Vercel / AWS / Railway), configure{" "}
                  <code>OMNIBEES_REQUESTOR_ID</code>,{" "}
                  <code>OMNIBEES_USERNAME</code>, <code>OMNIBEES_API_KEY</code>{" "}
                  e <code>OMNIBEES_WEBHOOK_SECRET</code> sem o prefixo{" "}
                  <code>NEXT_PUBLIC_</code>. Assim elas permanecem 100% ocultas
                  no Backend.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5]">
                <span className="text-[10px] uppercase tracking-widest text-[#0F5257] font-semibold block mb-1">
                  Passo 2 • Mapeamento de Tarifários (RatePlanCode)
                </span>
                <p className="text-sm font-medium text-[#182026]">
                  Vincular Tarifa Net + 15% e Tarifa BAR
                </p>
                <p className="mt-1 leading-relaxed">
                  Quando o hotel parceiro libera seu canal no portal Omnibees,
                  o motor busca o código configurado em{" "}
                  <code>OMNIBEES_RATE_PLAN_NET</code> e aplica automaticamente
                  sua proteção financeira de 15% líquidos no PIX e no Cartão.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-[#E5DEC9] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-medium block">
                    Envelope OTA_HotelAvailRQ (Backend Only)
                  </span>
                  <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                    XML Gerado pelo Servidor (Sem Expor Chaves)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(sampleAvailXml, "xml")}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] hover:border-[#B8863B] text-xs text-[#182026] cursor-pointer flex items-center gap-1.5"
                >
                  {copiedField === "xml" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#0F5257]" />
                      <span>XML Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#9A6D28]" />
                      <span>Copiar XML</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#182026] text-[#FAF7F2] text-[11px] font-mono overflow-x-auto leading-relaxed border border-[#182026]">
                {sampleAvailXml}
              </pre>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#F3EDE2] border border-[#DFD5C5] flex items-start gap-3 text-xs text-[#182026]">
              <Code2 className="w-5 h-5 text-[#9A6D28] shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">
                  Blindagem de Credenciais e LGPD Ativa
                </span>
                <p className="text-[#5C646B] mt-0.5 leading-relaxed">
                  Tanto o conector Omnibees quanto a base de clientes em{" "}
                  <code>/api/customers</code> operam exclusivamente no servidor
                  Node.js com validação de sessão HTTP-Only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
