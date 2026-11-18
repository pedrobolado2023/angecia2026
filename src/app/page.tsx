"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useEffectEvent } from "react";
import {
  HERO_SCENES,
  GEO_ORIGIN_PROFILES,
  STRATEGIC_CLUSTERS,
  DESTINATION_CITIES,
  CURATED_HOTELS,
  LIVE_FOMO_NOTIFICATIONS,
  CuratedHotel,
  RoomCategory,
} from "@/data/vellutoCatalog";
import { tokenizeCard } from "@/lib/mercadoPagoCard";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { isValidCPF } from "@/lib/cpfValidator";
import { prepareHotelbedsPhotos } from "@/lib/hotelbedsPhotos";
import { resolveRoomCancellationPolicy, type BookingCancellationPolicy } from "@/lib/cancellationPolicy";
import { PricingSimulatorDrawer } from "@/components/PricingSimulatorDrawer";
import { CouncilGovernanceModal } from "@/components/CouncilGovernanceModal";
import { ExtranetModal } from "@/components/ExtranetModal";
import { HotelResultFilters, emptyHotelFilters, mealPlans, type HotelFilters } from "@/components/HotelResultFilters";
import { HotelSearchFilters, type SearchCriteria } from "@/components/HotelSearchFilters";
import { LuxuryImage } from "@/components/LuxuryImage";
import { AdminOmnibeesPanel } from "@/components/AdminOmnibeesPanel";
import { CustomerAuthModal, LoggedCustomer } from "@/components/CustomerAuthModal";
import { CustomerBookings } from "@/components/CustomerBookings";
import { MembershipRenewalModal } from "@/components/MembershipRenewalModal";
import { LegalTermsModal, LegalModalTab } from "@/components/LegalTermsModal";
import { BlackFridayModal } from "@/components/BlackFridayModal";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Lock,
  Unlock,
  Clock,
  Eye,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Plane,
  Compass,
  Calculator,
  Award,
  CreditCard,
  QrCode,
  ArrowLeft,
  Building2,
  Home,
  Check,
  Gift,
  Users,
  Heart,
  Menu,
  X,
  Sliders,
  Bell,
  Download,
  Trash2,
  Search,
  AlertOctagon,
  Server,
  Copy,
  AlertCircle,
  Database,
  Calendar,
  User,
  RefreshCw,
  FileText,
  RotateCcw,
} from "lucide-react";

const SEARCH_LOADING_MESSAGE = "Buscando os melhores preços para você! Isso pode levar até 30 segundos...";

type ActiveScreen = "home" | "results" | "hotel" | "checkout" | "admin";

const CITY_TO_HOTELBEDS_DESTINATION: Record<string, string> = {
  "rio-de-janeiro": "RIO,BZI,ADR",
  "maceio-maragogi": "MAO,OGI",
  "porto-de-galinhas": "PDG,ATM",
  "trancoso-praia-do-forte": "PSE,SVD",
  "gramado-canela": "GRM,BGV",
  "campos-monte-verde": "JR2,0MC",
  "olimpia-litoral-sp": "OII,LHL",
  "caldas-rio-quente-pirenopolis": "CLN,GOI",
  "balneario-florianopolis-penha": "FLO,BLN,PEH",
  "fortaleza-jeri-natal-pipa": "FTZ,JRR,NAT,PDA",
};

const HOTELBEDS_PLACES: [string, string, string][] = [
  ["rio de janeiro", "RIO", "rio-de-janeiro"], ["rio", "RIO", "rio-de-janeiro"],
  ["buzios", "BZI", "rio-de-janeiro"], ["angra dos reis", "ADR", "rio-de-janeiro"],
  ["maceio", "MAO", "maceio-maragogi"], ["maragogi", "OGI", "maceio-maragogi"],
  ["porto de galinhas", "PDG", "porto-de-galinhas"], ["carneiros", "ATM", "porto-de-galinhas"], ["recife", "RCF", "porto-de-galinhas"],
  ["trancoso", "PSE", "trancoso-praia-do-forte"], ["praia do forte", "SVD", "trancoso-praia-do-forte"],
  ["salvador", "SVD", "trancoso-praia-do-forte"],
  ["gramado", "GRM", "gramado-canela"], ["bento goncalves", "BGV", "gramado-canela"], ["canela", "GRM", "gramado-canela"],
  ["campos do jordao", "JR2", "campos-monte-verde"], ["monte verde", "0MC", "campos-monte-verde"],
  ["sao paulo", "SAO", "olimpia-litoral-sp"], ["olimpia", "OII", "olimpia-litoral-sp"],
  ["ilhabela", "LHL", "olimpia-litoral-sp"],
  ["caldas novas", "CLN", "caldas-rio-quente-pirenopolis"], ["rio quente", "CLN", "caldas-rio-quente-pirenopolis"],
  ["pirenopolis", "GOI", "caldas-rio-quente-pirenopolis"], ["goiania", "GOI", "caldas-rio-quente-pirenopolis"],
  ["brasilia", "BSB", "caldas-rio-quente-pirenopolis"],
  ["florianopolis", "FLO", "balneario-florianopolis-penha"], ["balneario camboriu", "BLN", "balneario-florianopolis-penha"],
  ["penha", "PEH", "balneario-florianopolis-penha"], ["curitiba", "CUR", "balneario-florianopolis-penha"],
  ["fortaleza", "FTZ", "fortaleza-jeri-natal-pipa"], ["jericoacoara", "JRR", "fortaleza-jeri-natal-pipa"],
  ["natal", "NAT", "fortaleza-jeri-natal-pipa"], ["pipa", "PDA", "fortaleza-jeri-natal-pipa"],
  ["porto alegre", "POO", "gramado-canela"], ["belo horizonte", "BHZ", "campos-monte-verde"],
];

type HotelSort = "recommended" | "priceAscending" | "priceDescending" | "stars";

function officialStarRating(code?: string, name?: string): number {
  const match = code?.match(/^([1-5])(?:EST|STAR)?$/i) ||
    name?.match(/^([1-5])\s*(?:stars?|estrelas?)\b/i);
  return match ? Number(match[1]) : 0;
}

function countFilterOptions(values: string[], describe: (value: string) => string) {
  const totals = new Map<string, number>();
  for (const value of values) totals.set(value, (totals.get(value) || 0) + 1);
  return [...totals].map(([value, count]) => ({ value, count, label: describe(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function resultsUrl(criteria: SearchCriteria) {
  const params = new URLSearchParams({
    destino: criteria.query,
    entrada: criteria.checkIn,
    saida: criteria.checkOut,
    adultos: String(criteria.adults),
    criancas: String(criteria.children),
    bebes: String(criteria.infants),
  });
  if (criteria.collectionId) params.set("colecao", criteria.collectionId);
  return `/resultados?${params}`;
}

function saoPauloDate(offset = 0) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}


export default function HospedeClubApp() {
  const [hotelsCatalog, setHotelsCatalog] = useState<CuratedHotel[]>(CURATED_HOTELS);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [submittedSearch, setSubmittedSearch] = useState<SearchCriteria | null>(null);
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>(emptyHotelFilters);
  const [hotelSort, setHotelSort] = useState<HotelSort>("recommended");
  const resultsScroll = useRef(0);
  const focusSearchFilters = useRef(false);
  const hotelOrigin = useRef<ActiveScreen>("home");
  const currentResultsUrl = useRef("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Estado da sincronização ao vivo com Hotelbeds APItude
  const [isHotelbedsLoading, setIsHotelbedsLoading] = useState<boolean>(false);
  const [hotelbedsError, setHotelbedsError] = useState("");
  const [hotelbedsNotice, setHotelbedsNotice] = useState("");
  const [hotelbedsResult, setHotelbedsResult] = useState<CuratedHotel[]>([]);
  const hotelbedsRequest = useRef<AbortController | null>(null);
  const activeHotelbedsDestination = useRef("RIO,BZI,ADR");

  const [favoriteIds, setFavoriteIds] = useState<string[]>(["velluto-palace-sao-conrado"]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  const [isClubMember, setIsClubMember] = useState<boolean>(true);
  const [showClubModal, setShowClubModal] = useState<boolean>(false);
  const [memberId, setMemberId] = useState<string>("MEM-8492");
  const [memberName, setMemberName] = useState<string>("Pedro Pereira");
  const [memberCityOrigin, setMemberCityOrigin] = useState<string>("São Paulo (SP)");
  const [memberTravelProfile, setMemberTravelProfile] = useState<
    "Casal" | "Família" | "Villas & Grupos"
  >("Casal");
  const [memberPreferredDestinations, setMemberPreferredDestinations] = useState<
    string[]
  >(["Rio de Janeiro, Búzios & Angra", "Maceió & Maragogi"]);
  const [memberMarketingOptIn, setMemberMarketingOptIn] = useState<boolean>(true);
  const [clubSavedNotice, setClubSavedNotice] = useState<string | null>(null);
  const [accountDeletedNotice, setAccountDeletedNotice] = useState<string | null>(null);

  // Estados do Novo Sistema de Login / Cadastro de Clientes e Membro VIP
  const [loggedCustomer, setLoggedCustomer] = useState<LoggedCustomer | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<"register" | "login">("register");
  const [authModalCheckoutNotice, setAuthModalCheckoutNotice] = useState<string | undefined>(undefined);
  const [pendingCheckoutSelection, setPendingCheckoutSelection] = useState<{
    hotel: CuratedHotel;
    room: RoomCategory;
  } | null>(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState<boolean>(false);

  const [selectedGeoOriginId, setSelectedGeoOriginId] = useState<"SP" | "GYN" | "BSB" | "RJ">("SP");
  const currentGeoProfile = useMemo(
    () => GEO_ORIGIN_PROFILES.find((p) => p.id === selectedGeoOriginId) || GEO_ORIGIN_PROFILES[0],
    [selectedGeoOriginId]
  );

  const [selectedCityId, setSelectedCityId] = useState<string>("rio-de-janeiro");
  const searchQuery = submittedSearch?.query || "";
  const [hotelSearchFilter, setHotelSearchFilter] = useState("");

  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [nightsCount, setNightsCount] = useState<number>(1);

  useEffect(() => {
    setCheckInDate(saoPauloDate(1));
    setCheckOutDate(saoPauloDate(2));
  }, []);

  const getTodayString = useCallback(() => {
    return saoPauloDate();
  }, []);

  const addDaysToString = useCallback((dateStr: string, days: number) => {
    try {
      const parts = dateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch {
      return dateStr;
    }
  }, []);

  const calculateDaysDiff = useCallback((startStr: string, endStr: string) => {
    try {
      const p1 = startStr.split("-").map(Number);
      const p2 = endStr.split("-").map(Number);
      const d1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
      const d2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, []);

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckInDate(newCheckIn);
    if (!checkOutDate || newCheckIn >= checkOutDate) {
      const nextOut = addDaysToString(newCheckIn, nightsCount > 0 ? nightsCount : 1);
      setCheckOutDate(nextOut);
    } else {
      setNightsCount(calculateDaysDiff(newCheckIn, checkOutDate));
    }
  };

  const handleCheckOutChange = (newCheckOut: string) => {
    if (newCheckOut <= checkInDate) {
      const adjustedCheckIn = addDaysToString(newCheckOut, -1);
      setCheckInDate(adjustedCheckIn);
      setCheckOutDate(newCheckOut);
      setNightsCount(1);
    } else {
      setCheckOutDate(newCheckOut);
      setNightsCount(calculateDaysDiff(checkInDate, newCheckOut));
    }
  };
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [infantsCount, setInfantsCount] = useState<number>(0);
  const [isGuestsSelectorOpen, setIsGuestsSelectorOpen] = useState<boolean>(false);
  const guestsSelectorContainerRef = useRef<HTMLDivElement | null>(null);
  const [isHotelGuestsOpen, setIsHotelGuestsOpen] = useState<boolean>(false);
  const hotelGuestsContainerRef = useRef<HTMLDivElement | null>(null);

  const [legalModalTab, setLegalModalTab] = useState<LegalModalTab | null>(null);
  const [selectedCancelPolicyText, setSelectedCancelPolicyText] = useState<string | undefined>(undefined);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

  const totalGuestsCount = useMemo(
    () => adultsCount + childrenCount + infantsCount,
    [adultsCount, childrenCount, infantsCount]
  );

  const guestsSummaryLabel = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${adultsCount} ${adultsCount === 1 ? "Adulto" : "Adultos"}`);
    if (childrenCount > 0) {
      parts.push(`${childrenCount} ${childrenCount === 1 ? "Criança" : "Crianças"}`);
    }
    if (infantsCount > 0) {
      parts.push(`${infantsCount} ${infantsCount === 1 ? "Infantil" : "Infantis"}`);
    }
    return parts.join(", ");
  }, [adultsCount, childrenCount, infantsCount]);

  const [heroSceneIndex, setHeroSceneIndex] = useState<number>(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const [selectedHotelId, setSelectedHotelId] = useState<string>(CURATED_HOTELS[0].id);
  const selectedHotel = useMemo(
    () => hotelsCatalog.find((h) => h.id === selectedHotelId) || hotelsCatalog[0],
    [hotelsCatalog, selectedHotelId]
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(CURATED_HOTELS[0].rooms[0].id);
  const selectedRoom = useMemo(
    () =>
      selectedHotel.rooms.find((r) => r.id === selectedRoomId) ||
      selectedHotel.rooms[0] || CURATED_HOTELS[0].rooms[0],
    [selectedHotel, selectedRoomId]
  );

  const [checkoutQuote, setCheckoutQuote] = useState<{
    orderId: string; amount: number; fingerprint: string; publicKey?: string;
    conditions?: { cancellationPolicy?: BookingCancellationPolicy; rateComments?: string };
  } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [confirmedStay, setConfirmedStay] = useState<{ hotelName: string; roomName: string; checkIn: string; checkOut: string; holder: string } | null>(null);
  const [extraGuestDetails, setExtraGuestDetails] = useState<Record<string, { name: string; surname: string; age: string }>>({});
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [selectedInstallments, setSelectedInstallments] = useState<number>(6);

  // Titular da Reserva (1º Adulto)
  const [primaryFirstName, setPrimaryFirstName] = useState<string>("Pedro");
  const [primaryLastName, setPrimaryLastName] = useState<string>("Pereira");
  const [primaryEmail, setPrimaryEmail] = useState<string>("membro@hospedeclub.com.br");
  const [primaryEmailConfirm, setPrimaryEmailConfirm] = useState<string>("membro@hospedeclub.com.br");
  const [primaryCountry, setPrimaryCountry] = useState<string>("Brasil");
  const [primaryCpf, setPrimaryCpf] = useState<string>("");
  const [primaryWhatsapp, setPrimaryWhatsapp] = useState<string>("(11) 99812-4400");
  const [primaryBirthDate, setPrimaryBirthDate] = useState<string>("1992-06-20");

  // Dados do Segundo Adulto (Acompanhante)
  const [secondGuestFirstName, setSecondGuestFirstName] = useState<string>("");
  const [secondGuestLastName, setSecondGuestLastName] = useState<string>("");
  const [secondGuestCpf, setSecondGuestCpf] = useState<string>("");
  const [secondGuestBirthDate, setSecondGuestBirthDate] = useState<string>("");

  // Dados do Cartão de Crédito Mercado Pago
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardHolder, setCardHolder] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");

  // Estado da transação Mercado Pago & PostgreSQL
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [mpPixData, setMpPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl?: string;
  } | null>(null);
  const [mpPixCopied, setMpPixCopied] = useState<boolean>(false);
  const [postgresSavedStatus, setPostgresSavedStatus] = useState<boolean | null>(null);

  const [guestFullName, setGuestFullName] = useState<string>("Pedro Pereira");
  const [guestEmail, setGuestEmail] = useState<string>("membro@hospedeclub.com.br");
  const [guestWhatsapp, setGuestWhatsapp] = useState<string>("+55 (11) 99812-4400");
  const [bookingConfirmedVoucher, setBookingConfirmedVoucher] = useState<string | null>(null);
  const [bookingSupplierRemarks, setBookingSupplierRemarks] = useState<string | null>(null);
  const [webhookStatusText, setWebhookStatusText] = useState<string | null>(null);

  const [isPricingDrawerOpen, setIsPricingDrawerOpen] = useState<boolean>(false);
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState<boolean>(false);
  const [isExtranetModalOpen, setIsExtranetModalOpen] = useState<boolean>(false);
  const [isBlackFridayModalOpen, setIsBlackFridayModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("hospede_bf_dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => {
          setIsBlackFridayModalOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleCloseBlackFriday = useCallback(() => {
    setIsBlackFridayModalOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hospede_bf_dismissed", "true");
    }
  }, []);

  const [pushNotificationBanner, setPushNotificationBanner] = useState<string | null>(null);
  const [countdownTick, setCountdownTick] = useState<number>(0);

  const syncCustomerActivityToBackend = (
    activityType:
      | "SEARCH"
      | "VIEW_HOTEL"
      | "FAVORITE_SYNC"
      | "CHECKOUT_INTENT"
      | "BOOKING_CONFIRMED"
      | "DELETE_ACCOUNT",
    payload: Record<string, unknown>
  ) => {
    fetch("/api/customers/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: memberId,
        email: guestEmail,
        fullName: guestFullName,
        whatsapp: guestWhatsapp,
        cityOrigin: memberCityOrigin,
        activityType,
        payload,
      }),
    }).catch(() => {
      // ignore background error
    });
  };

  const handleSaveMemberClubProfile = async (
    authMethodLabel:
      | "Cadastro Clube"
      | "WhatsApp VIP"
      | "Google"
      | "Apple" = "Cadastro Clube"
  ) => {
    try {
      const favNames = hotelsCatalog
        .filter((h) => favoriteIds.includes(h.id))
        .map((h) => h.name);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          fullName: guestFullName,
          email: guestEmail,
          whatsapp: guestWhatsapp,
          cityOrigin: memberCityOrigin,
          preferredDestinations: memberPreferredDestinations,
          travelProfile: memberTravelProfile,
          authMethod: authMethodLabel,
          marketingOptIn: memberMarketingOptIn,
          favoriteHotelIds: favoriteIds,
          favoriteHotelNames: favNames,
        }),
      });
      const data = await res.json();
      if (data.ok && data.memberProfile) {
        setMemberId(data.memberProfile.id);
        setMemberName(data.memberProfile.fullName);
      }
      setIsClubMember(true);
      setAccountDeletedNotice(null);
      setClubSavedNotice(
        "Cadastro salvo com segurança no servidor! Tarifas Secretas de Membro ativas."
      );
      setTimeout(() => {
        setClubSavedNotice(null);
        setShowClubModal(false);
      }, 1100);
    } catch {
      setIsClubMember(true);
      setShowClubModal(false);
    }
  };

  // Carrega imediatamente sessão em cache local e valida com o PostgreSQL via /api/auth/me
  useEffect(() => {
    // 1. Restaura instantaneamente do localStorage se o navegador foi reiniciado
    try {
      const cached = localStorage.getItem("hospede_customer_profile");
      if (cached) {
        const customer = JSON.parse(cached);
        if (customer && customer.id && customer.email) {
          setLoggedCustomer(customer);
          setIsClubMember(customer.membership?.status !== "EXPIRED");
          setMemberName(customer.fullName);
          setMemberId(customer.id);
          if (customer.address?.city) {
            setMemberCityOrigin(`${customer.address.city} (${customer.address.state})`);
          }
          const nameParts = (customer.fullName || "").trim().split(" ");
          setPrimaryFirstName(nameParts[0] || "");
          setPrimaryLastName(nameParts.slice(1).join(" ") || "");
          setPrimaryEmail(customer.email);
          setPrimaryEmailConfirm(customer.email);
          setPrimaryWhatsapp(customer.whatsapp);
          if (customer.cpf) setPrimaryCpf(customer.cpf);
        }
      }
    } catch {
      // ignore
    }

    // 2. Valida com o PostgreSQL no servidor
    async function checkCustomerSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.customer) {
          setLoggedCustomer(data.customer);
          try {
            localStorage.setItem("hospede_customer_profile", JSON.stringify(data.customer));
          } catch {}
          setIsClubMember(data.customer.membership?.status !== "EXPIRED");
          setMemberName(data.customer.fullName);
          setMemberId(data.customer.id);
          if (data.customer.address?.city) {
            setMemberCityOrigin(`${data.customer.address.city} (${data.customer.address.state})`);
          }
          const nameParts = data.customer.fullName.trim().split(" ");
          setPrimaryFirstName(nameParts[0] || "");
          setPrimaryLastName(nameParts.slice(1).join(" ") || "");
          setPrimaryEmail(data.customer.email);
          setPrimaryEmailConfirm(data.customer.email);
          setPrimaryWhatsapp(data.customer.whatsapp);
          if (data.customer.cpf) setPrimaryCpf(data.customer.cpf);
        } else {
          // Se não houver sessão ativa no servidor e nenhum cache válido, remove
          if (!localStorage.getItem("hospede_customer_profile")) {
            setIsClubMember(false);
          }
        }
      } catch {
        // Em caso de falha de rede temporária, preserva o estado ativo do cache
      }
    }
    checkCustomerSession();
  }, []);

  const handleAuthSuccess = (customer: LoggedCustomer) => {
    setLoggedCustomer(customer);
    try {
      localStorage.setItem("hospede_customer_profile", JSON.stringify(customer));
    } catch {}
    setIsClubMember(customer.membership?.status !== "EXPIRED");
    setMemberName(customer.fullName);
    setMemberId(customer.id);
    if (customer.address?.city) {
      setMemberCityOrigin(`${customer.address.city} (${customer.address.state})`);
    }

    const nameParts = customer.fullName.trim().split(" ");
    setPrimaryFirstName(nameParts[0] || "");
    setPrimaryLastName(nameParts.slice(1).join(" ") || "");
    setPrimaryEmail(customer.email);
    setPrimaryEmailConfirm(customer.email);
    setPrimaryWhatsapp(customer.whatsapp);
    if (customer.cpf) setPrimaryCpf(customer.cpf);

    if (pendingCheckoutSelection) {
      const { hotel, room } = pendingCheckoutSelection;
      setPendingCheckoutSelection(null);
      // Avança diretamente para o checkout da hospedagem selecionada
      handleDirectCheckoutProceed(hotel, room);
    }
  };

  const handleCustomerLogout = async () => {
    try {
      localStorage.removeItem("hospede_customer_profile");
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setLoggedCustomer(null);
    setIsClubMember(false);
  };

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("hospede_favorites_v1") ||
        localStorage.getItem("velluto_favorites_v1");
      if (saved) {
        setFavoriteIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleClickOutsideGuests = (event: MouseEvent) => {
      if (
        guestsSelectorContainerRef.current &&
        !guestsSelectorContainerRef.current.contains(event.target as Node)
      ) {
        setIsGuestsSelectorOpen(false);
      }
      if (
        hotelGuestsContainerRef.current &&
        !hotelGuestsContainerRef.current.contains(event.target as Node)
      ) {
        setIsHotelGuestsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideGuests);
    return () => document.removeEventListener("mousedown", handleClickOutsideGuests);
  }, []);

  const toggleFavorite = (hotelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteIds((prev) => {
      const next = prev.includes(hotelId)
        ? prev.filter((id) => id !== hotelId)
        : [...prev, hotelId];
      try {
        localStorage.setItem("hospede_favorites_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      const nextNames = hotelsCatalog
        .filter((h) => next.includes(h.id))
        .map((h) => h.name);
      syncCustomerActivityToBackend("FAVORITE_SYNC", {
        favoriteHotelIds: next,
        favoriteHotelNames: nextNames,
      });
      return next;
    });
  };

  const getRoomCancellationInfo = useCallback(
    (room: any) => {
      return resolveRoomCancellationPolicy(room, checkInDate);
    },
    [checkInDate]
  );

  const fetchLiveHotelbedsHotels = useCallback(
    async (
      destinationCode: string = "RIO",
      targetCityId?: string,
      customCheckIn?: string,
      customCheckOut?: string,
      customAdults?: number,
      customChildren?: number,
      propertyQuery?: string,
      hotelCode?: string | number,
      customInfants?: number
    ) => {
      if (hotelCode) currentResultsUrl.current = "";
      hotelbedsRequest.current?.abort();
      const controller = new AbortController();
      hotelbedsRequest.current = controller;
      const { signal } = controller;
      activeHotelbedsDestination.current = destinationCode;
      setHotelbedsError("");
      setHotelbedsNotice("");
      setHotelbedsResult([]);
      setIsHotelbedsLoading(true);
      const checkIn = customCheckIn || checkInDate;
      const checkOut = customCheckOut || checkOutDate;
      const cityId = targetCityId || selectedCityId;
      try {
        if (checkIn < saoPauloDate() || checkOut <= checkIn) {
          throw new Error("Confira as datas de entrada e saída.");
        }
        const destinationCodes = propertyQuery || hotelCode ? [destinationCode.split(",")[0]] : [...new Set(destinationCode.split(","))];
        const responses = await Promise.allSettled(destinationCodes.map(async (code) => {
          const params = new URLSearchParams({
            checkIn, checkOut, destinationCode: code,
            adults: String(customAdults ?? adultsCount),
            children: String(customChildren ?? childrenCount),
            infants: String(customInfants ?? infantsCount),
          });
          if (propertyQuery) params.set("property", propertyQuery);
          if (hotelCode) params.set("hotelCodes", String(hotelCode));
          const res = await fetch(`/api/hotelbeds/availability?${params}`, {
            signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
          });
          const data = await res.json();
          if (!res.ok || !data.ok || data.isSimulation || !Array.isArray(data.hotels)) throw new Error();
          return data;
        }));
        if (signal.aborted) return;
        const successful = responses.flatMap((response) => response.status === "fulfilled" ? [response.value] : []);
        if (!successful.length) throw new Error("Não foi possível concluir a busca. Tente pesquisar novamente.");

        const uniqueHotels = new Map<string, any>();
        successful.forEach((result) => result.hotels.forEach((hotel: any) => {
          if (hotel.code && hotel.hospedeClubPricing) uniqueHotels.set(String(hotel.code), hotel);
        }));
        const officialHotels = [...uniqueHotels.values()];
        const loadedPhotos = await prepareHotelbedsPhotos(officialHotels.flatMap((hotel) => [
          hotel.heroImage, ...(hotel.gallery || []),
          ...(hotel.rooms || []).flatMap((room: any) => [room.heroImage, ...(room.gallery || [])]),
        ]), signal);
        if (signal.aborted) return;
        const city = DESTINATION_CITIES.find((item) => item.id === cityId);
        const photos = (hero: string | undefined, gallery: string[] | undefined) =>
          [...new Set([hero, ...(gallery || [])])].filter((url): url is string => Boolean(url && loadedPhotos.has(url)));
        const stayNights = Math.max(1, (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
        const perNight = (amount: number) => Math.round((amount / stayNights) * 100) / 100;
        const hotels: CuratedHotel[] = officialHotels.map((hotel) => {
          const gallery = photos(hotel.heroImage, hotel.gallery);
          const { netRate, barRate } = hotel.hospedeClubPricing;
          const existingId = CURATED_HOTELS.find((item) => String(item.hotelbedsCode) === String(hotel.code))?.id;
          return {
            id: existingId || `hotelbeds-${hotel.code}`,
            hotelbedsCode: hotel.code,
            name: hotel.name,
            subtitle: hotel.categoryName || "Hospedagem",
            cityId,
            cityName: hotel.city || hotel.destinationName || city?.shortName || "",
            stateCode: "BR",
            neighborhood: hotel.zoneName || "",
            clusterId: city?.clusterId || "cluster-1",
            accommodationType: "hotel",
            stars: officialStarRating(hotel.categoryCode, hotel.categoryName),
            mealPlanCodes: [...new Set<string>((hotel.rooms || []).flatMap((room: { rates?: { boardCode?: string }[] }) =>
              (room.rates || []).flatMap((rate) => rate.boardCode && Object.hasOwn(mealPlans, rate.boardCode) ? [rate.boardCode] : [])
            ))],
            ratingScore: 0,
            reviewsCount: 0,
            heroImage: gallery[0] || "",
            gallery,
            netRate: perNight(netRate),
            barRate: perNight(barRate),
            omnibeesAvailableRooms: hotel.rooms?.[0]?.rates?.[0]?.allotted ?? 1,
            scarcityLabel: hotel.rooms?.[0]?.rates?.[0]?.boardName || "Consulte as tarifas disponíveis",
            liveViewersCount: 0,
            lastBookingNotice: "",
            isFlashDeal: false,
            flashDealRemainingSeconds: 0,
            omnibeesChannelCode: `HB-${hotel.code}`,
            primaryLandmarkDistance: hotel.address || hotel.zoneName || "",
            landmarkDistances: [],
            curationHighlights: [hotel.description, ...(hotel.facilities || [])].filter(Boolean),
            rooms: (hotel.rooms || []).filter((room: any) => room.rates?.length).map((room: any) => {
              const rate = room.rates[0];
              const roomPhotos = photos(room.heroImage, room.gallery);
              return {
                id: `hb-rm-${hotel.code}-${room.code}`,
                hotelbedsRoomCode: room.code,
                name: room.name || "Quarto",
                sizeM2: 0,
                viewLabel: "",
                bedConfig: "",
                netRate: perNight(rate.net || netRate),
                barRate: perNight(rate.sellingRate || barRate),
                omnibeesAvailableCount: rate.allotted ?? 1,
                minStay: 1,
                boardBasis: rate.boardName || "",
                highlights: [],
                heroImage: roomPhotos[0],
                gallery: roomPhotos,
                rates: room.rates,
              };
            }),
          };
        });
        if (successful.length < destinationCodes.length || successful.some((result) => result.contentIncomplete)) {
          setHotelbedsNotice("Algumas informações não foram carregadas. Tente pesquisar novamente.");
        } else if (hotels.some((hotel) => !hotel.heroImage)) {
          setHotelbedsNotice("Alguns hotéis estão sem foto oficial disponível.");
        }
        setHotelbedsResult(hotels);
        setHotelsCatalog((previous) => {
          const matches = new Set(hotels.map((hotel) => hotel.id));
          return [...hotels, ...previous.filter((hotel) => !matches.has(hotel.id))];
        });
      } catch (err) {
        if (!signal.aborted) setHotelbedsError(err instanceof Error ? err.message : "Não foi possível concluir a consulta.");
      } finally {
        if (!signal.aborted) {
          setIsHotelbedsLoading(false);
        }
      }
    },
    [selectedCityId, checkInDate, checkOutDate, adultsCount, childrenCount, infantsCount]
  );

  useEffect(() => () => hotelbedsRequest.current?.abort(), []);


  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const formatBRLCents = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatCountdown = (baseSeconds: number) => {
    const rem = Math.max(60, baseSeconds - countdownTick);
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    const s = rem % 60;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const normalizeForSearch = (str: string) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const cleanSearchQuery = (str: string) => {
    let s = normalizeForSearch(str);
    s = s.replace(
      /\b(estado\s+do|estado\s+de|estado\s+da|estado|cidade\s+do|cidade\s+de|cidade\s+da|cidade|hoteis\s+em|hoteis\s+no|hoteis\s+na|hotel\s+em|hotel\s+no|hotel\s+na|pousada\s+em|pousadas\s+em|hospedagem\s+em|hospedagens\s+em|hoteis|hotel|pousadas|pousada)\b/gi,
      " "
    );
    return s.replace(/\s+/g, " ").trim();
  };

  const matchesHotelSearch = (hotel: CuratedHotel, query: string) => {
    const words = (cleanSearchQuery(query) || normalizeForSearch(query)).split(/\s+/).filter(Boolean);
    const haystack = normalizeForSearch(`${hotel.name} ${hotel.cityName} ${hotel.neighborhood} ${hotel.primaryLandmarkDistance}`);
    return words.every((word) => haystack.includes(word));
  };

  const savedHotels = hotelsCatalog.filter((hotel) =>
    favoriteIds.includes(hotel.id) && hotel.omnibeesChannelCode.startsWith("HB-")
  );
  const searchHotels = useMemo(() => hotelbedsResult.filter((hotel) => matchesHotelSearch(hotel, hotelSearchFilter))
    .map((hotel) => ({
      hotel,
      region: hotel.neighborhood.trim(),
      pricing: calculateVellutoPricing(hotel.netRate, hotel.barRate, 0.15, hotel.cleaningFee, hotel.securityDeposit),
    })), [hotelbedsResult, hotelSearchFilter]);

  const resultFilterOptions = useMemo(() => ({
    stars: Array.from({ length: 5 }, (_, index) => {
      const stars = index + 1;
      return {
        value: String(stars),
        label: `${stars} ${stars === 1 ? "estrela" : "estrelas"}`,
        count: searchHotels.filter(({ hotel }) => hotel.stars === stars).length,
      };
    }),
    regions: countFilterOptions(searchHotels.flatMap(({ region }) => region ? [region] : []), (region) => region),
    meals: countFilterOptions(searchHotels.flatMap(({ hotel }) => hotel.mealPlanCodes || []), (code) => mealPlans[code]),
  }), [searchHotels]);

  const visibleSearchHotels = searchHotels.filter(({ hotel, region, pricing }) =>
    (!hotelFilters.stars.length || hotelFilters.stars.includes(String(hotel.stars))) &&
    (!hotelFilters.regions.length || hotelFilters.regions.includes(region)) &&
    (!hotelFilters.meals.length || hotelFilters.meals.some((meal) => hotel.mealPlanCodes?.includes(meal))) &&
    (!hotelFilters.maxPrice || Math.round(pricing.pix.pixPrice) <= Number(hotelFilters.maxPrice)) &&
    (!hotelFilters.savedOnly || favoriteIds.includes(hotel.id))
  );
  if (hotelSort !== "recommended") {
    visibleSearchHotels.sort((a, b) => {
      if (hotelSort === "stars") return b.hotel.stars - a.hotel.stars;
      const priceDifference = a.pricing.pix.pixPrice - b.pricing.pix.pixPrice;
      return hotelSort === "priceAscending" ? priceDifference : -priceDifference;
    });
  }

  const activeDestinationCity = DESTINATION_CITIES.find((city) => city.id === selectedCityId) || DESTINATION_CITIES[0];
  const heroSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [heroSearchText, setHeroSearchText] = useState("");
  const [hotelBarSearchText, setHotelBarSearchText] = useState("");

  const executeHotelbedsSearch = (criteria: SearchCriteria, fromHistory = false) => {
    const { query: rawQuery, collectionId, checkIn, checkOut, adults, children, infants } = criteria;
    const query = cleanSearchQuery(rawQuery);
    const place = [...HOTELBEDS_PLACES].sort((a, b) => b[0].length - a[0].length)
      .find(([name]) => query === name || ` ${query} `.includes(` ${name} `));
    const collection = DESTINATION_CITIES.find((city) =>
      [city.name, city.shortName, city.stateName, city.stateCode].some((name) => name && normalizeForSearch(name) === query)
    );
    const cityId = place?.[2] || collection?.id || selectedCityId;
    const destination = place?.[1] || CITY_TO_HOTELBEDS_DESTINATION[cityId] || "RIO";
    // Some provider destinations cover several cities. Keep the city filter in those cases.
    const exactDestinationNames = new Set(["rio", "rio de janeiro", "buzios", "angra dos reis", "maceio",
      "porto de galinhas", "recife", "gramado", "campos do jordao", "monte verde", "sao paulo",
      "olimpia", "ilhabela", "caldas novas", "goiania", "brasilia", "florianopolis", "balneario camboriu",
      "penha", "curitiba", "fortaleza", "jericoacoara", "natal", "pipa", "porto alegre", "belo horizonte"]);
    const hotelQuery = (collection && !place) || (place && query === place[0] && exactDestinationNames.has(query))
      ? "" : rawQuery;
    const exactCollection = DESTINATION_CITIES.find((city) => city.id === collectionId);
    const rioNeighborhood = /^(copacabana|ipanema|leblon|barra da tijuca|sao conrado|botafogo|centro do rio)$/.test(query);
    const resolvedCity = exactCollection?.id || (rioNeighborhood ? "rio-de-janeiro" : cityId);
    const resolvedDestination = exactCollection ? CITY_TO_HOTELBEDS_DESTINATION[resolvedCity] : rioNeighborhood ? "RIO" : destination;
    const url = resultsUrl(criteria);
    if (!fromHistory && window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, "", url);
    }
    if (currentResultsUrl.current !== url) {
      setHotelFilters(emptyHotelFilters);
      setHotelSort("recommended");
    }
    currentResultsUrl.current = url;
    resultsScroll.current = 0;
    setSelectedCityId(resolvedCity);
    setShowFavoritesOnly(false);
    setMobileMenuOpen(false);
    setActiveScreen("results");
    setSubmittedSearch(criteria);
    setHeroSearchText(rawQuery);
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);
    setNightsCount(calculateDaysDiff(checkIn, checkOut));
    setAdultsCount(adults);
    setChildrenCount(children);
    setInfantsCount(infants);
    setHotelSearchFilter(exactCollection ? "" : hotelQuery);
    fetchLiveHotelbedsHotels(resolvedDestination || "RIO", resolvedCity, checkIn, checkOut, adults, children,
      !exactCollection && !place && !collection && !rioNeighborhood ? query : undefined, undefined, infants);
    window.scrollTo(0, 0);
  };

  const searchWithCurrentFilters = (query: string, collectionId?: string) => {
    executeHotelbedsSearch({
      query, collectionId, checkIn: checkInDate, checkOut: checkOutDate,
      adults: adultsCount, children: childrenCount, infants: infantsCount,
    });
  };

  const restoreSearchFromUrl = useEffectEvent(() => {
    if (window.location.pathname !== "/resultados") {
      setActiveScreen("home");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const readDate = (key: string, fallback: string) => {
      const value = params.get(key) || "";
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? value : fallback;
    };
    const readCount = (key: string, fallback: number, min: number, max: number) => {
      const value = Number(params.get(key) ?? fallback);
      return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
    };
    const checkIn = readDate("entrada", saoPauloDate(1));
    const criteria: SearchCriteria = {
      query: params.get("destino")?.trim().slice(0, 120) || "Rio de Janeiro",
      checkIn,
      checkOut: readDate("saida", addDaysToString(checkIn, 1)),
      adults: readCount("adultos", 2, 1, 8),
      children: readCount("criancas", 0, 0, 4),
      infants: readCount("bebes", 0, 0, 4),
      collectionId: params.get("colecao") || undefined,
    };
    if (resultsUrl(criteria) === currentResultsUrl.current) {
      const hash = window.location.hash;
      const hotel = hotelbedsResult.find((entry) => hash === `#hotel-${encodeURIComponent(entry.id)}`);
      if (hotel) {
        hotelOrigin.current = "results";
        setSelectedHotelId(hotel.id);
        setSelectedRoomId(hotel.rooms[0]?.id || "");
        setActivePhotoIndex(0);
        setActiveScreen("hotel");
        window.scrollTo(0, 0);
        return;
      }
      setActiveScreen("results");
      requestAnimationFrame(() => {
        if (focusSearchFilters.current) {
          focusSearchFilters.current = false;
          document.getElementById("result-destination")?.focus();
        } else {
          window.scrollTo(0, resultsScroll.current);
        }
      });
      return;
    }
    // On reload the hotel list must be fetched again before a property can be opened.
    if (window.location.hash) window.history.replaceState(null, "", resultsUrl(criteria));
    executeHotelbedsSearch(criteria, true);
  });

  useEffect(() => {
    const onPopState = () => restoreSearchFromUrl();
    if (window.location.pathname === "/resultados") onPopState();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      currentResultsUrl.current = "";
    };
  }, []);

  const goHome = () => {
    if (window.location.pathname === "/resultados") window.history.pushState(null, "", "/");
    setActiveScreen("home");
  };

  const handleExecuteHeroSearch = () => {
    if (!heroSearchText.trim()) return handleOpenDestination(selectedCityId);
    searchWithCurrentFilters(heroSearchText.trim());
  };

  const handleExecuteHotelBarSearch = (overrideQuery?: string) => {
    const rawQuery = (overrideQuery ?? hotelBarSearchText).trim();
    if (!rawQuery) {
      fetchLiveHotelbedsHotels(activeHotelbedsDestination.current, selectedCityId, undefined, undefined, undefined, undefined, undefined, selectedHotel.hotelbedsCode);
      return;
    }
    setHeroSearchText(rawQuery);
    searchWithCurrentFilters(rawQuery);
  };

  const canBookSelectedHotel = !isHotelbedsLoading && hotelbedsResult.some((hotel) => hotel.id === selectedHotelId);


  const handleUpdateHotelFromExtranet = (
    hotelId: string,
    updates: {
      netRate: number;
      barRate: number;
      omnibeesAvailableRooms: number;
      stopSell: boolean;
      omnibeesChannelCode?: string;
    }
  ) => {
    setHotelsCatalog((prev) =>
      prev.map((h) => {
        if (h.id !== hotelId) return h;
        const updatedRooms = h.rooms.map((r, idx) =>
          idx === 0
            ? {
                ...r,
                netRate: updates.netRate,
                barRate: updates.barRate,
                omnibeesAvailableCount: updates.omnibeesAvailableRooms,
              }
            : r
        );
        return {
          ...h,
          netRate: updates.netRate,
          barRate: updates.barRate,
          omnibeesAvailableRooms: updates.omnibeesAvailableRooms,
          stopSell: updates.stopSell,
          omnibeesChannelCode: updates.omnibeesChannelCode ?? h.omnibeesChannelCode,
          scarcityLabel:
            updates.omnibeesAvailableRooms === 0 || updates.stopSell
              ? "Esgotado • Stop Sell Ativo"
              : `Apenas ${updates.omnibeesAvailableRooms} suítes restantes nesta tarifa`,
          rooms: updatedRooms,
        };
      })
    );
  };

  const handleAddHotelFromAdmin = (newHotel: CuratedHotel) => {
    setHotelsCatalog((prev) => [newHotel, ...prev]);
  };

  const handleOpenDestination = (cityId: string) => {
    setSelectedCityId(cityId);
    const matchedCity = DESTINATION_CITIES.find((c) => c.id === cityId);
    if (matchedCity) {
      syncCustomerActivityToBackend("SEARCH", {
        query: matchedCity.name,
        destinationName: `${matchedCity.name} (${matchedCity.stateCode})`,
        checkInDate,
        checkOutDate,
        nights: nightsCount,
        guests: totalGuestsCount,
        adults: adultsCount,
        children: childrenCount,
        infants: infantsCount,
      });
    }
    searchWithCurrentFilters(matchedCity?.name || "Rio de Janeiro", cityId);
  };

  const handleSelectBlackFridayDeal = (cityId: string) => {
    handleCloseBlackFriday();
    handleOpenDestination(cityId);
  };

  const rememberHotelOrigin = (hotel: CuratedHotel) => {
    hotelOrigin.current = activeScreen;
    if (activeScreen === "results" && submittedSearch) {
      resultsScroll.current = window.scrollY;
      window.history.pushState(null, "", `${resultsUrl(submittedSearch)}#hotel-${encodeURIComponent(hotel.id)}`);
    }
  };

  const handleOpenHotelDetail = (hotel: CuratedHotel) => {
    if (!hotelbedsResult.some((entry) => entry.id === hotel.id) && hotel.hotelbedsCode) {
      fetchLiveHotelbedsHotels(activeHotelbedsDestination.current, hotel.cityId, undefined, undefined, undefined, undefined, undefined, hotel.hotelbedsCode);
    }
    rememberHotelOrigin(hotel);
    setSelectedHotelId(hotel.id);
    setSelectedRoomId(hotel.rooms[0]?.id || "");
    setActivePhotoIndex(0);
    setBookingConfirmedVoucher(null);
    setHotelBarSearchText("");
    setActiveScreen("hotel");
    setMobileMenuOpen(false);
    syncCustomerActivityToBackend("VIEW_HOTEL", {
      hotelId: hotel.id,
      hotelName: hotel.name,
      cityName: hotel.cityName,
      stateCode: hotel.stateCode,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDirectCheckoutProceed = (hotel: CuratedHotel, room?: RoomCategory) => {
    const chosenRoom = room || hotel.rooms[0];
    if (!chosenRoom) return;
    if (activeScreen === "results") rememberHotelOrigin(hotel);
    setSelectedHotelId(hotel.id);
    setSelectedRoomId(chosenRoom.id);
    setBookingConfirmedVoucher(null);
    setWebhookStatusText(null);
    setCheckoutError(null);
    setCheckoutQuote(null);
    setActiveOrderId("");
    setCheckoutState("");
    setConfirmedStay(null);
    setExtraGuestDetails({});
    setMpPixData(null);
    setPostgresSavedStatus(null);
    setActiveScreen("checkout");
    setMobileMenuOpen(false);
    const pricing = calculateVellutoPricing(
      chosenRoom.netRate,
      chosenRoom.barRate,
      0.15,
      hotel.cleaningFee || 0,
      hotel.securityDeposit || 0
    );
    const extraFees = (hotel.cleaningFee || 0) + (hotel.securityDeposit || 0);
    syncCustomerActivityToBackend("CHECKOUT_INTENT", {
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomName: chosenRoom.name,
      paymentMethod: paymentMethod === "pix" ? "PIX" : "CARD",
      estimatedTotal: pricing.pix.pixPrice * nightsCount + extraFees,
      nights: nightsCount,
      checkInDate,
      checkOutDate,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDirectCheckout = (hotel: CuratedHotel, room?: RoomCategory) => {
    if (isHotelbedsLoading || !hotelbedsResult.some((entry) => entry.id === hotel.id) || hotel.stopSell || hotel.omnibeesAvailableRooms <= 0) {
      return;
    }
    const chosenRoom = room || hotel.rooms[0];
    if (!chosenRoom) return;

    // Exige login/cadastro para concluir a reserva
    if (!loggedCustomer) {
      setPendingCheckoutSelection({ hotel, room: chosenRoom });
      setAuthModalCheckoutNotice(
        `Para reservar com Tarifa de Membro no ${hotel.name}, faça login ou cadastre-se (com 7 dias VIP grátis).`
      );
      setAuthModalInitialMode("register");
      setIsAuthModalOpen(true);
      return;
    }

    handleDirectCheckoutProceed(hotel, chosenRoom);
  };

  const activeRoomPricing = useMemo(
    () =>
      calculateVellutoPricing(
        selectedRoom.netRate,
        selectedRoom.barRate,
        0.15,
        selectedHotel.cleaningFee || 0,
        selectedHotel.securityDeposit || 0
      ),
    [selectedRoom, selectedHotel]
  );

  const villaExtraFeesTotal = useMemo(() => {
    if (selectedHotel.accommodationType !== "villa") return 0;
    return (selectedHotel.cleaningFee || 0) + (selectedHotel.securityDeposit || 0);
  }, [selectedHotel]);

  const formatCPF = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})/g, "$1 ").trim();
  };

  const formatCardExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const extraCheckoutGuests = [
    ...Array.from({ length: Math.max(0, adultsCount - 2) }, (_, i) => ({ key: `adult-${i}`, label: `Adulto ${i + 3}`, minAge: null, maxAge: null })),
    ...Array.from({ length: childrenCount }, (_, i) => ({ key: `child-${i}`, label: `Criança ${i + 1}`, minAge: 6, maxAge: 17 })),
    ...Array.from({ length: infantsCount }, (_, i) => ({ key: `infant-${i}`, label: `Infantil ${i + 1}`, minAge: 0, maxAge: 5 })),
  ];
  const selectedRate = (selectedRoom as RoomCategory & { rates?: { rateKey: string; boardCode: string; rateClass: string; offerToken?: string }[] }).rates?.[0];
  const quoteRequest = {
    action: "quote", hotelbedsCode: selectedHotel.hotelbedsCode, roomCode: selectedRoom.hotelbedsRoomCode,
    rateKey: selectedRate?.rateKey, boardCode: selectedRate?.boardCode, rateClass: selectedRate?.rateClass,
    offerToken: selectedRate?.offerToken,
    adults: adultsCount, children: childrenCount, infants: infantsCount, checkInDate, checkOutDate,
    paymentModality: paymentMethod === "pix" ? "PIX" : "CARD", installments: selectedInstallments, acceptedTerms,
    primaryFirstName, primaryLastName, primaryEmail, primaryEmailConfirm, primaryCountry, primaryCpf,
    primaryWhatsapp, primaryBirthDate, secondGuestFirstName, secondGuestLastName,
    extraGuests: extraCheckoutGuests.map(({ key, minAge }) => {
      const detail = extraGuestDetails[key];
      return {
        name: detail?.name || "", surname: detail?.surname || "",
        age: minAge !== null && detail?.age !== undefined && detail.age !== "" ? Number(detail.age) : undefined,
      };
    }),
  };
  const quoteFingerprint = JSON.stringify(quoteRequest);
  const currentCheckoutQuote = checkoutQuote?.fingerprint === quoteFingerprint ? checkoutQuote : null;
  const customerCheckoutStorageKey = loggedCustomer ? `hospede-checkout-${loggedCustomer.id}` : "";

  const applyCheckoutStatus = useCallback((data: {
    state: string; method?: "pix" | "card"; voucherCode?: string; supplierRemarks?: string;
    stay?: { hotelName: string; roomName: string; checkIn: string; checkOut: string; holder: string };
    mercadoPago?: { pix?: { qrCode: string; qrCodeBase64: string; ticketUrl?: string; expiresAt?: string } };
  }) => {
    const { state, voucherCode } = data;
    if (data.method) setPaymentMethod(data.method);
    setCheckoutState(state);
    setMpPixData(data.mercadoPago?.pix || null);
    if (state === "confirmed" && voucherCode) {
      setBookingConfirmedVoucher(voucherCode);
      setConfirmedStay(data.stay || null);
      setBookingSupplierRemarks(data.supplierRemarks || null);
      setPostgresSavedStatus(true);
      setWebhookStatusText("Pagamento aprovado e reserva confirmada.");
    } else if (state === "pending") {
      setWebhookStatusText("Aguardando a aprovação do pagamento. A reserva será confirmada após a aprovação.");
    } else if (state === "confirming") {
      setWebhookStatusText("Pagamento aprovado. Estamos confirmando a reserva.");
    } else if (state === "paying") {
      setWebhookStatusText("Aguardando a resposta do pagamento. Aguarde a atualização antes de tentar pagar novamente.");
    } else if (state === "review") {
      setWebhookStatusText("O pedido precisa de verificação. Entre em contato com o atendimento e informe o código do pedido antes de tentar pagar novamente.");
    } else if (state === "quoted") {
      setWebhookStatusText(null);
    } else if (state === "rejected") {
      setCheckoutError("O pagamento não foi concluído. Confira os dados ou tente outra forma de pagamento.");
      setCheckoutQuote(null);
      setWebhookStatusText(null);
    }
  }, []);

  useEffect(() => {
    if (activeScreen !== "checkout" || !customerCheckoutStorageKey || activeOrderId) return;
    try {
      const saved = sessionStorage.getItem(customerCheckoutStorageKey);
      if (saved) setActiveOrderId(saved);
    } catch { /* O pedido continua registrado no servidor. */ }
  }, [activeScreen, customerCheckoutStorageKey, activeOrderId]);

  useEffect(() => {
    if (activeScreen !== "checkout" || !activeOrderId || ["confirmed", "rejected", "review"].includes(checkoutState)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/bookings?orderId=${encodeURIComponent(activeOrderId)}`, { cache: "no-store" });
        if (response.ok && !cancelled) {
          const data = await response.json();
          if (!cancelled) applyCheckoutStatus(data);
        }
      } catch { /* Uma falha de rede não altera o estado do pedido. */ }
      if (!cancelled) timer = setTimeout(refresh, 7000);
    };
    timer = setTimeout(refresh, checkoutState ? 7000 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeScreen, activeOrderId, checkoutState, applyCheckoutStatus]);

  useEffect(() => {
    if (checkoutState !== "rejected" && checkoutState !== "quoted") return;
    if (customerCheckoutStorageKey) {
      try { sessionStorage.removeItem(customerCheckoutStorageKey); } catch {}
    }
    setActiveOrderId("");
  }, [checkoutState, customerCheckoutStorageKey]);

  const handleConfirmBookingWithWebhook = async () => {
    if (isProcessingCheckout || activeOrderId) return;
    setCheckoutError(null);
    if (!acceptedTerms) {
      setCheckoutError("Leia e aceite os termos antes de continuar.");
      return;
    }
    setIsProcessingCheckout(true);
    try {
      if (!currentCheckoutQuote) {
        const res = await fetch("/api/bookings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: quoteFingerprint,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não foi possível conferir o preço.");
        setCheckoutQuote({ ...data, fingerprint: quoteFingerprint });
        return;
      }
      let card;
      if (paymentMethod === "card") {
        if (!currentCheckoutQuote.publicKey || cardNumber.replace(/\D/g, "").length < 13 ||
            !cardHolder.trim() || cardExpiry.replace(/\D/g, "").length !== 4 || cardCvv.replace(/\D/g, "").length < 3) {
          throw new Error("Confira os dados do cartão antes de pagar.");
        }
        card = await tokenizeCard({
          publicKey: currentCheckoutQuote.publicKey, number: cardNumber, holder: cardHolder,
          expiry: cardExpiry, cvv: cardCvv, cpf: primaryCpf,
        });
        setCardNumber("");
        setCardCvv("");
        setCardExpiry("");
        setCardHolder("");
      }
      const { orderId } = currentCheckoutQuote;
      setActiveOrderId(orderId);
      applyCheckoutStatus({ state: "paying" });
      try { if (customerCheckoutStorageKey) sessionStorage.setItem(customerCheckoutStorageKey, orderId); } catch {}
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", orderId, card }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status < 500) {
          try { if (customerCheckoutStorageKey) sessionStorage.removeItem(customerCheckoutStorageKey); } catch {}
          setActiveOrderId("");
          setCheckoutState("");
          setWebhookStatusText(null);
        }
        if (res.status === 409) setCheckoutQuote(null);
        throw new Error(data.error || "Não foi possível concluir o pagamento.");
      }
      applyCheckoutStatus(data);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const activeScene = HERO_SCENES[heroSceneIndex];
  const hotelAllPhotos = useMemo(() => {
    const set = new Set([selectedHotel.heroImage, ...selectedHotel.gallery].filter(Boolean));
    return Array.from(set);
  }, [selectedHotel]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#182026] pb-20 lg:pb-0">
      {/* BANNER DE PUSH NOTIFICATION SEGMENTADA */}
      {pushNotificationBanner && (
        <div className="bg-[#0F5257] text-white px-4 py-2 text-xs border-b border-[#B8863B]/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-normal">
              <Bell className="w-3.5 h-3.5 text-[#FFE599] shrink-0" />
              <span>{pushNotificationBanner}</span>
            </div>
            <button
              onClick={() => setPushNotificationBanner(null)}
              className="text-[#FFE599] hover:underline shrink-0 cursor-pointer font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR SOLAR & ELEGANTE (100% VOLTADA AO CLIENTE) */}
      <div className="bg-[#F3EDE2] text-[#5C646B] border-b border-[#E3DACB] text-[11px] py-1.5 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!loggedCustomer) {
                  setAuthModalInitialMode("register");
                  setIsAuthModalOpen(true);
                } else {
                  setShowClubModal(true);
                }
              }}
              className="inline-flex items-center gap-1.5 text-[#0F5257] hover:text-[#9A6D28] font-semibold transition cursor-pointer group"
              title="Faça parte do Hóspede Club"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B8863B] group-hover:scale-110 transition-transform" />
              <span>Seja Membro!</span>
            </button>
          </div>

          {/* Acesso do Membro */}
          <div className="flex items-center gap-3 shrink-0">
            {loggedCustomer ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClubModal(true)}
                  className="text-[#9A6D28] hover:text-[#7A551E] font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#B8863B]" />
                  <span>
                    Olá, {loggedCustomer.fullName.split(" ")[0]}
                    {loggedCustomer.membership?.status === "TRIAL_ACTIVE" && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#B8863B]/15 text-[#9A6D28] font-bold">
                        VIP ({loggedCustomer.membership.daysRemaining}d)
                      </span>
                    )}
                    {loggedCustomer.membership?.status === "EXPIRED" && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#B83B2B]/15 text-[#B83B2B] font-bold">
                        Trial Expirado
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={handleCustomerLogout}
                  className="text-[#5C646B] hover:text-[#182026] text-[11px] cursor-pointer ml-1"
                  title="Sair da Conta"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalInitialMode("register");
                  setIsAuthModalOpen(true);
                }}
                className="text-[#9A6D28] hover:text-[#7A551E] font-medium cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-[#B8863B]" />
                <span>Cadastrar Membro (7 Dias VIP Grátis)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HEADER EDITORIAL CLARO & ILUMINADO (PEARL IVORY GLASS) */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md text-[#182026] border-b border-[#E5DEC9] shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <button
            onClick={() => {
              goHome();
              setShowFavoritesOnly(false);
              setMobileMenuOpen(false);
            }}
            className="text-left group cursor-pointer flex items-center gap-2 sm:gap-3 min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-[#B8863B]/60 shadow-xs flex items-center justify-center bg-[#11161B] group-hover:border-[#B8863B] group-hover:scale-105 transition shrink-0">
              <img
                src="/icon.svg"
                alt="Hóspede Club"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <span className="font-editorial text-lg sm:text-2xl tracking-[0.16em] sm:tracking-[0.22em] text-[#182026] font-normal block leading-none truncate">
                HÓSPEDE CLUB
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.16em] sm:tracking-[0.22em] text-[#9A6D28] block mt-0.5 sm:mt-1 truncate">
                Hospedagens com Desconto
              </span>
            </div>
          </button>

          {/* Navegação Editorial Clara (Sem ferramentas internas expostas no topo) */}
          <nav className="hidden lg:flex items-center gap-7 text-xs tracking-wider uppercase">
            <button
              onClick={() => {
                goHome();
                setShowFavoritesOnly(false);
              }}
              className={`py-1 transition cursor-pointer border-b-2 ${
                activeScreen === "home" && !showFavoritesOnly
                  ? "text-[#9A6D28] border-[#B8863B] font-medium"
                  : "text-[#5C646B] border-transparent hover:text-[#182026]"
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveScreen("checkout")}
              className={`py-1 transition cursor-pointer border-b-2 ${
                activeScreen === "checkout"
                  ? "text-[#9A6D28] border-[#B8863B] font-medium"
                  : "text-[#5C646B] border-transparent hover:text-[#182026]"
              }`}
            >
              Reserva
            </button>
          </nav>

          {/* Ações Direita: Favoritos + Hóspede Club */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                goHome();
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                showFavoritesOnly
                  ? "bg-[#B83B2B] border-[#B83B2B] text-white shadow-xs"
                  : "bg-white border-[#E2D9C8] text-[#182026] hover:border-[#B8863B]"
              }`}
              title="Salvos"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  showFavoritesOnly
                    ? "fill-white text-white"
                    : favoriteIds.length > 0
                    ? "fill-[#B83B2B] text-[#B83B2B]"
                    : "text-[#5C646B]"
                }`}
              />
              <span className="hidden md:inline text-[11px]">Salvos ({favoriteIds.length})</span>
            </button>

            {loggedCustomer ? (
              loggedCustomer.membership?.status === "EXPIRED" ? (
                <button
                  onClick={() => setIsRenewalModalOpen(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] tracking-wide flex items-center gap-1.5 transition cursor-pointer bg-[#B83B2B] text-white shadow-xs hover:bg-[#962E20]"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Renovar R$ 19,90/mês</span>
                  <span className="sm:hidden">Renovar</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowClubModal(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] tracking-wide flex items-center gap-1.5 transition cursor-pointer border bg-[#0F5257] border-[#0F5257] text-white shadow-xs"
                >
                  <Unlock className="w-3 h-3 shrink-0 text-[#FFE599]" />
                  <span className="hidden sm:inline">
                    Membro VIP ({loggedCustomer.membership?.daysRemaining || 7}d)
                  </span>
                  <span className="sm:hidden">Membro</span>
                </button>
              )
            ) : (
              <button
                onClick={() => {
                  setAuthModalInitialMode("register");
                  setIsAuthModalOpen(true);
                }}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] tracking-wide flex items-center gap-1.5 transition cursor-pointer border bg-[#B8863B] border-[#B8863B] text-white hover:bg-[#9A6D28] shadow-xs"
              >
                <Lock className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Entrar / Cadastrar</span>
                <span className="sm:hidden">Entrar</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-[#182026] hover:text-[#B8863B] cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MENU MOBILE CLARO */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[#E5DEC9] px-4 py-4 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  goHome();
                  setShowFavoritesOnly(false);
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-left border ${
                  activeScreen === "home"
                    ? "bg-[#B8863B] text-white border-[#B8863B] font-medium"
                    : "bg-[#FAF7F2] text-[#182026] border-[#E5DEC9]"
                }`}
              >
                Início
              </button>
              <button
                onClick={() => {
                  setActiveScreen("checkout");
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-left border ${
                  activeScreen === "checkout"
                    ? "bg-[#B8863B] text-white border-[#B8863B] font-medium"
                    : "bg-[#FAF7F2] text-[#182026] border-[#E5DEC9]"
                }`}
              >
                Reserva
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          TELA 01: HOME SOLAR & RIVIERA DAYLIGHT (CLARA, BONITA E CHAMATIVA)
         ===================================================================== */}
      {activeScreen === "home" && (
        <main className="flex-1">
          {/* HERO SECTION SOLAR & LUMINOSA */}
          <section className="relative z-20 bg-[#F3EDE2] text-[#182026] min-h-[460px] sm:min-h-[520px] md:min-h-[570px] flex items-center border-b border-[#E5DEC9]">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <LuxuryImage
                src={activeScene.videoPoster}
                alt={activeScene.title}
                fallbackLabel={activeScene.title}
                className="w-full h-full opacity-95 animate-ken-burns"
                priority
              />
              {/* Gradiente Diurno Suave: Alabastro Luminoso à esquerda abrindo para a paisagem viva à direita */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2]/96 via-[#FAF7F2]/85 to-[#FAF7F2]/25" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-transparent to-white/20" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 w-full">
              <div className="max-w-2xl">
                <h1 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal text-[#182026] leading-[1.15] sm:leading-[1.12]">
                  A arte de se hospedar no{" "}
                  <span className="italic text-[#B8863B]">extraordinário.</span>
                </h1>

                <p className="text-xs sm:text-base text-[#465058] mt-3 sm:mt-4 max-w-xl leading-relaxed font-normal">
                  Estadias singulares com tarifas exclusivas negociadas diretamente com os hotéis e resorts mais desejados do Brasil.
                </p>
              </div>

              {/* BARRA DE BUSCA EM BRANCO PURO COM CAMPO LIVRE DE DESTINO */}
              <div className="mt-6 sm:mt-8 bg-white/95 backdrop-blur-xl border border-[#DED4C3] rounded-2xl p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(24,32,38,0.12)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
                  <div className="sm:col-span-2 lg:col-span-4 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-3 sm:pb-0 lg:pr-4">
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1.5">
                      Destino ou Propriedade
                    </label>

                    <div className="flex items-center gap-2 bg-[#FAF7F2] px-3.5 py-2.5 rounded-xl border border-[#E2D9C8] focus-within:border-[#B8863B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8863B]/15 transition">
                      <Search className="w-4 h-4 text-[#B8863B] shrink-0" />
                      <input
                        ref={heroSearchInputRef}
                        type="text"
                        value={heroSearchText}
                        onChange={(e) => {
                          setHeroSearchText(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleExecuteHeroSearch();
                          }
                        }}
                        placeholder="Para onde você quer viajar? (Ex: Rio, Gramado, Maceió...)"
                        className="w-full bg-transparent text-[#182026] text-xs sm:text-sm font-medium placeholder:text-[#5C646B]/60 placeholder:font-normal focus:outline-none"
                      />
                      {heroSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setHeroSearchText("");
                            heroSearchInputRef.current?.focus();
                          }}
                          className="p-1 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#EAE3D5] transition cursor-pointer shrink-0"
                          title="Limpar busca"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-3 sm:pb-0 lg:pr-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium">
                        Check-in & Check-out
                      </label>
                      <span className="text-[10px] font-semibold text-[#9A6D28] bg-[#F4E8D1] px-2 py-0.5 rounded-full">
                        {nightsCount} {nightsCount === 1 ? "diária" : "diárias"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5C646B] mb-0.5 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-[#B8863B]" />
                          <span>Entrada</span>
                        </div>
                        <input
                          type="date"
                          value={checkInDate}
                          min={getTodayString()}
                          onChange={(e) => handleCheckInChange(e.target.value)}
                          className="bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border border-[#E2D9C8] focus:outline-none focus:border-[#B8863B] w-full cursor-pointer font-medium"
                        />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5C646B] mb-0.5 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-[#B8863B]" />
                          <span>Saída</span>
                        </div>
                        <input
                          type="date"
                          value={checkOutDate}
                          min={addDaysToString(checkInDate, 1)}
                          onChange={(e) => handleCheckOutChange(e.target.value)}
                          className="bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border border-[#E2D9C8] focus:outline-none focus:border-[#B8863B] w-full cursor-pointer font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    ref={guestsSelectorContainerRef}
                    className="relative sm:col-span-1 lg:col-span-2 pb-2 sm:pb-0"
                  >
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1.5">
                      Hóspedes
                    </label>

                    {/* Botão Gatilho do Seletor */}
                    <button
                      type="button"
                      onClick={() => setIsGuestsSelectorOpen(!isGuestsSelectorOpen)}
                      className={`w-full bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border flex items-center justify-between gap-1 transition cursor-pointer text-left ${
                        isGuestsSelectorOpen
                          ? "border-[#B8863B] bg-white ring-2 ring-[#B8863B]/15"
                          : "border-[#E2D9C8] hover:border-[#B8863B]/70"
                      }`}
                    >
                      <span className="truncate font-medium text-xs">
                        {guestsSummaryLabel}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#5C646B] shrink-0 transition-transform duration-200 ${
                          isGuestsSelectorOpen ? "rotate-180 text-[#B8863B]" : ""
                        }`}
                      />
                    </button>

                    {/* POPOVER SELETOR DE ADULTOS, CRIANÇAS E INFANTIL */}
                    {isGuestsSelectorOpen && (
                      <div className="absolute right-0 sm:left-0 sm:right-auto w-[290px] sm:w-[320px] top-full mt-2 z-50 bg-white border border-[#D5C7B2] rounded-2xl shadow-[0_20px_50px_rgba(24,32,38,0.18)] p-4 space-y-3.5">
                        <div className="pb-2 border-b border-[#F0EAE0] flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-semibold">
                            Composição dos Hóspedes
                          </span>
                          <span className="text-xs text-[#5C646B]">
                            Total: <strong className="text-[#182026]">{totalGuestsCount}</strong>
                          </span>
                        </div>

                        {/* 1. ADULTOS */}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-[#182026] block">Adultos</span>
                            <span className="text-[10px] text-[#5C646B] block">A partir de 18 anos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={adultsCount <= 1}
                              onClick={() => setAdultsCount((prev) => Math.max(1, prev - 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-[#182026] tabular-price">
                              {adultsCount}
                            </span>
                            <button
                              type="button"
                              disabled={adultsCount >= 10}
                              onClick={() => setAdultsCount((prev) => Math.min(10, prev + 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 2. CRIANÇAS */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F8F5EE]">
                          <div>
                            <span className="text-xs font-semibold text-[#182026] block">Crianças</span>
                            <span className="text-[10px] text-[#5C646B] block">6 a 17 anos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={childrenCount <= 0}
                              onClick={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-[#182026] tabular-price">
                              {childrenCount}
                            </span>
                            <button
                              type="button"
                              disabled={childrenCount >= 6}
                              onClick={() => setChildrenCount((prev) => Math.min(6, prev + 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 3. BEBÊS / INFANTIL */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F8F5EE]">
                          <div>
                            <span className="text-xs font-semibold text-[#182026] block">Infantil</span>
                            <span className="text-[10px] text-[#5C646B] block">0 a 5 anos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={infantsCount <= 0}
                              onClick={() => setInfantsCount((prev) => Math.max(0, prev - 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-[#182026] tabular-price">
                              {infantsCount}
                            </span>
                            <button
                              type="button"
                              disabled={infantsCount >= 4}
                              onClick={() => setInfantsCount((prev) => Math.min(4, prev + 1))}
                              className="w-7 h-7 rounded-full border border-[#D8CBB8] text-[#182026] hover:bg-[#F3EDE2] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* AÇÃO CONCLUIR */}
                        <div className="pt-2 border-t border-[#F0EAE0] flex items-center justify-between">
                          <span className="text-[11px] text-[#5C646B]">
                            {adultsCount} ad • {childrenCount} cri • {infantsCount} inf
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsGuestsSelectorOpen(false)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs font-medium cursor-pointer transition"
                          >
                            Concluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-1 lg:col-span-2">
                    <button
                      type="button"
                      onClick={handleExecuteHeroSearch}
                      disabled={isHotelbedsLoading}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.14em] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80 disabled:cursor-wait"
                    >
                      {isHotelbedsLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <span>Explorar Tarifas</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* INDICADOR DE BUSCA AO VIVO (Visível para o cliente somente durante o carregamento) */}
                {isHotelbedsLoading && (
                  <div className="mt-4 pt-3 border-t border-[#EAE3D5] flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B8863B] animate-ping shrink-0" />
                    <span className="text-[#9A6D28] font-semibold animate-pulse">
                      {SEARCH_LOADING_MESSAGE}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SEÇÃO DE DESTINOS E COLEÇÕES EXCLUSIVAS */}
          <section id="hospede-catalog-section" className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-8 sm:py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                  Coleção Exclusiva
                </span>
                <h2 className="font-editorial text-2xl sm:text-4xl font-normal text-[#182026]">
                  Destinos e Refúgios Mais Desejados
                </h2>
              </div>

              <button
                onClick={() => setIsClubMember(!isClubMember)}
                className="self-start md:self-auto px-3.5 sm:px-4 py-2 rounded-full border border-[#DFD5C5] bg-white text-xs text-[#182026] hover:border-[#B8863B] shadow-2xs transition cursor-pointer flex items-center gap-2"
              >
                {isClubMember ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-[#0F5257]" />
                    <span>Exibindo: Tarifa Secreta Membro</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#B83B2B]" />
                    <span>Exibindo: Tarifa Pública (BAR)</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {currentGeoProfile.recommendedCityIds.map((cityId) => {
                const city = DESTINATION_CITIES.find((c) => c.id === cityId);
                if (!city) return null;
                return (
                  <div
                    key={city.id}
                    onClick={() => handleOpenDestination(city.id)}
                    className="group rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] hover:border-[#B8863B] flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-xl transition duration-500"
                  >
                    <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                      <LuxuryImage
                        src={city.heroImage}
                        alt={city.name}
                        fallbackLabel={city.name}
                        priority
                        className="w-full h-full group-hover:scale-105 transition duration-700"
                      />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20">
                        <span className="px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md text-[#182026] text-[10px] tracking-wider uppercase font-medium shadow-xs">
                          {city.stateName || "Brasil"}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-[#B83B2B] text-white text-[10px] font-medium shadow-xs">
                          Até -{city.avgSavingsPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 bg-white flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium block">
                          {city.stateCode} • {city.regionTag}
                        </span>
                        <h3 className="font-editorial text-xl sm:text-2xl font-normal text-[#182026] leading-snug mt-0.5">
                          {city.shortName}
                        </h3>
                        <p className="text-xs text-[#5C646B] line-clamp-1 mt-1">
                          {city.landmarks[0]?.name}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs">
                        <span className="text-[#0F5257] font-medium">
                          Tarifas de Membro
                        </span>
                        <span className="text-[#B8863B] font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
                          <span>Explorar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* EXIBE APENAS SE O USUÁRIO CLICAR EM "SALVOS" NO TOPO */}
          {showFavoritesOnly && (
            <section className="bg-white border-t border-[#E5DEC9] py-12 px-4 sm:px-6 md:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                      Sua Lista Privada
                    </span>
                    <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-[#182026]">
                      Propriedades Salvas ({favoriteIds.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="px-4 py-2 rounded-full border border-[#DFD5C5] bg-[#FAF7F2] text-xs text-[#182026] hover:border-[#B8863B] transition cursor-pointer"
                  >
                    Voltar à Tela Principal
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {savedHotels.map((hotel) => {
                    const pricing = calculateVellutoPricing(
                      hotel.netRate,
                      hotel.barRate,
                      0.15,
                      hotel.cleaningFee || 0,
                      hotel.securityDeposit || 0
                    );
                    const isFav = favoriteIds.includes(hotel.id);
                    const isSoldOut = Boolean(hotel.stopSell || hotel.omnibeesAvailableRooms <= 0);

                    return (
                      <article
                        key={hotel.id}
                        className="rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E5DEC9] shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative h-60 overflow-hidden">
                            <LuxuryImage
                              src={hotel.heroImage}
                              alt={hotel.name}
                              fallbackLabel={hotel.name}
                              className="w-full h-full hover:scale-105 transition duration-700"
                            />
                            <div className="absolute top-3.5 right-3.5 z-20">
                              <button
                                onClick={(e) => toggleFavorite(hotel.id, e)}
                                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#182026] hover:text-[#B83B2B] shadow-sm transition cursor-pointer"
                                aria-label="Salvar"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isFav ? "fill-[#B83B2B] text-[#B83B2B]" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                          <div className="p-6 bg-white">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium block">
                              {hotel.neighborhood} • {hotel.cityName}
                            </span>
                            <h3 className="font-editorial text-2xl font-normal text-[#182026] mt-0.5">
                              {hotel.name}
                            </h3>
                            <p className="text-xs text-[#5C646B] mt-1">{hotel.subtitle}</p>
                          </div>
                        </div>
                        <div className="px-6 pb-6 pt-4 border-t border-[#EAE3D5] bg-[#FAF7F2] flex items-center justify-between gap-4">
                          <div className="tabular-price">
                            <span className="text-xs text-[#5C646B] line-through block">
                              {formatBRL(pricing.barRate)}
                            </span>
                            <span className="text-xl font-semibold text-[#0F5257]">
                              {formatBRL(pricing.pix.pixPrice)}
                            </span>
                            <span className="text-xs text-[#5C646B]"> /noite</span>
                          </div>
                          <button
                            disabled={isSoldOut}
                            onClick={() => handleOpenHotelDetail(hotel)}
                            className="py-2.5 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs uppercase tracking-[0.12em] font-medium transition cursor-pointer shadow-xs"
                          >
                            Ver Propriedade
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* =====================================================================
          TELA 02: PÁGINA DE DESTINO (COMPACTA, ELEGANTE E COM FOCO NOS QUARTOS)
         ===================================================================== */}
      {activeScreen === "results" && submittedSearch && (
            <main id="search-results" className="flex-1 bg-[#FAF7F2] border-t border-[#E5DEC9] py-10 px-4 sm:px-6 md:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                      Resultados da Pesquisa
                    </span>
                    <h1 className="font-editorial text-2xl sm:text-4xl font-normal text-[#182026]">
                      {isHotelbedsLoading ? "Buscando hotéis" : hotelbedsError ? "Consulta indisponível" : `${searchHotels.length} ${searchHotels.length === 1 ? "propriedade encontrada" : "propriedades encontradas"}`} para &ldquo;{searchQuery}&rdquo;
                    </h1>
                  </div>
                </div>
                <HotelSearchFilters key={resultsUrl(submittedSearch)} criteria={submittedSearch} earliestDate={getTodayString()}
                  onSearch={(criteria) => executeHotelbedsSearch(criteria)} />
                {isHotelbedsLoading && (
                  <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-[#B8863B]/40 bg-white p-4 text-sm font-semibold text-[#182026]">
                    <RefreshCw aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-[#B8863B]" />
                    {SEARCH_LOADING_MESSAGE}
                  </div>
                )}

                {hotelbedsNotice && <p role="status" className="mb-4 text-sm text-[#9A6D28]">{hotelbedsNotice}</p>}
                <div className={searchHotels.length > 0 ? "grid gap-6 lg:grid-cols-[235px_minmax(0,1fr)]" : ""}>
                  {searchHotels.length > 0 && (
                    <HotelResultFilters filters={hotelFilters} options={resultFilterOptions} onChange={setHotelFilters} />
                  )}
                  <div className="min-w-0">
                    {searchHotels.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p aria-live="polite" className="text-sm text-[#5C646B]">
                          {visibleSearchHotels.length} de {searchHotels.length} hotéis
                        </p>
                        <label className="flex items-center gap-2 text-sm font-medium">
                          Ordenar por
                          <select value={hotelSort} onChange={(event) => setHotelSort(event.target.value as HotelSort)}
                            className="rounded-lg border border-[#E2D9C8] bg-white px-3 py-2">
                            <option value="recommended">Ordem padrão</option>
                            <option value="priceAscending">Menor preço</option>
                            <option value="priceDescending">Maior preço</option>
                            <option value="stars">Mais estrelas</option>
                          </select>
                        </label>
                      </div>
                    )}
                {hotelbedsError ? (
                  <p role="alert" className="mb-4 text-sm text-[#B83B2B]">{hotelbedsError}</p>
                ) : visibleSearchHotels.length === 0 ? (
                  isHotelbedsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={`home-skel-${s}`}
                          className="rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] shadow-sm animate-pulse flex flex-col justify-between"
                        >
                          <div>
                            <div className="h-52 bg-gradient-to-r from-[#EAE3D5] via-[#F5EFE6] to-[#EAE3D5]" />
                            <div className="p-4 space-y-2.5">
                              <div className="h-3 w-24 bg-[#EAE3D5] rounded-full" />
                              <div className="h-5 w-3/4 bg-[#EAE3D5] rounded-md" />
                              <div className="h-3 w-1/2 bg-[#EAE3D5] rounded-full" />
                            </div>
                          </div>
                          <div className="p-4 pt-0 border-t border-[#F0EAE0] mt-3 space-y-2">
                            <div className="h-6 w-28 bg-[#EAE3D5] rounded-md" />
                            <div className="h-9 w-full bg-[#EAE3D5] rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchHotels.length > 0 ? (
                    <div className="rounded-2xl border border-[#E5DEC9] bg-white p-8 text-center">
                      <p className="text-sm">Nenhum hotel corresponde aos filtros selecionados.</p>
                      <button type="button" onClick={() => setHotelFilters(emptyHotelFilters)}
                        className="mt-3 text-sm font-semibold text-[#0F5257] underline">
                        Limpar filtros
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-[#E5DEC9] p-8 text-center max-w-xl mx-auto space-y-3">
                      <p className="text-[#182026] font-medium text-sm">
                        Nenhum hotel disponível para &ldquo;{searchQuery}&rdquo; nas datas selecionadas.
                      </p>
                      <p className="text-xs text-[#5C646B]">
                        Tente pesquisar por &ldquo;Rio de Janeiro&rdquo;, &ldquo;Copacabana&rdquo;, &ldquo;São Conrado&rdquo;, &ldquo;Gramado&rdquo; ou &ldquo;Maceió&rdquo;.
                      </p>

                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleSearchHotels.map(({ hotel, pricing }) => {
                      const isFav = favoriteIds.includes(hotel.id);
                      const isSoldOut = Boolean(hotel.stopSell || hotel.omnibeesAvailableRooms <= 0);

                      return (
                        <article
                          key={hotel.id}
                          className="rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] shadow-sm hover:shadow-md transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative h-52 overflow-hidden">
                              <LuxuryImage
                                src={hotel.heroImage}
                                alt={hotel.name}
                                fallbackLabel={hotel.name}
                                className="w-full h-full hover:scale-105 transition duration-700"
                              />
                              <div className="absolute top-3.5 right-3.5 z-20">
                                <button
                                  onClick={(e) => toggleFavorite(hotel.id, e)}
                                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#182026] hover:text-[#B83B2B] shadow-sm transition cursor-pointer"
                                  aria-label="Salvar"
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      isFav ? "fill-[#B83B2B] text-[#B83B2B]" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="absolute bottom-3 left-3 z-20">
                                <span className="px-2.5 py-1 rounded-full bg-[#182026]/85 backdrop-blur-md text-white text-[10px] font-medium tracking-wide">
                                  {hotel.stateCode} • {hotel.neighborhood}
                                </span>
                              </div>
                            </div>
                            <div className="p-5">
                              <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium block">
                                {hotel.cityName}
                              </span>
                              <h3 className="font-editorial text-xl font-normal text-[#182026] mt-0.5 leading-snug">
                                {hotel.name}
                              </h3>
                              <p className="text-xs text-[#5C646B] line-clamp-2 mt-1.5">{hotel.stars ? `${hotel.stars} ${hotel.stars === 1 ? "estrela" : "estrelas"}` : hotel.subtitle}</p>
                            </div>
                          </div>
                          <div className="px-5 pb-5 pt-3 border-t border-[#F0EAE1] bg-[#FAF7F2] flex items-center justify-between gap-3">
                            <div className="tabular-price">
                              <span className="text-xs text-[#5C646B] line-through block">
                                {formatBRL(pricing.barRate)}
                              </span>
                              <span className="text-lg font-semibold text-[#0F5257]">
                                {formatBRL(pricing.pix.pixPrice)}
                              </span>
                              <span className="text-xs text-[#5C646B]"> /noite</span>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                            <button
                              disabled={isSoldOut}
                              onClick={() => handleOpenHotelDetail(hotel)}
                              className="py-2 px-4 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white text-xs uppercase tracking-[0.1em] font-medium transition cursor-pointer shadow-xs"
                            >
                              Ver Tarifas
                            </button>
                              {submittedSearch.collectionId && (
                                <button type="button" disabled={isSoldOut || !hotel.rooms.length}
                                  onClick={() => handleDirectCheckout(hotel)}
                                  className="rounded-xl border border-[#DFD5C5] px-3 py-2 text-xs font-medium disabled:opacity-50">
                                  Reservar
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                  </div>
                </div>
              </div>
            </main>
      )}

      {activeScreen === "hotel" && (
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 sm:py-10 w-full pb-24 lg:pb-10">
          <div className="flex flex-wrap gap-5 mb-5 text-xs font-medium text-[#9A6D28]">
            <button type="button" onClick={() => {
              if (hotelOrigin.current === "results") window.history.back();
              else setActiveScreen(hotelOrigin.current);
            }} className="inline-flex items-center gap-2 hover:underline cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              {hotelOrigin.current === "results" ? "Voltar aos resultados" : "Voltar"}
            </button>
            {hotelOrigin.current === "results" && (
              <button type="button" onClick={() => {
                focusSearchFilters.current = true;
                window.history.back();
              }} className="hover:underline cursor-pointer">
                Alterar busca
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 mb-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                {selectedHotel.neighborhood} • {selectedHotel.cityName} ({selectedHotel.stateCode})
              </span>
              <h1 className="font-editorial text-2xl sm:text-5xl font-normal text-[#182026]">
                {selectedHotel.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#5C646B] mt-1 sm:mt-1.5">
                {selectedHotel.primaryLandmarkDistance}
              </p>
            </div>

            <div className="self-start lg:self-auto px-3.5 py-1.5 sm:py-2 rounded-full bg-[#B83B2B]/10 border border-[#B83B2B]/25 text-xs text-[#B83B2B] font-medium">
              {selectedHotel.scarcityLabel}
            </div>
          </div>

          {hotelOrigin.current !== "results" && (
          <div className="bg-white border border-[#E5DEC9] rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#F0EAE0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B8863B]" />
                <span className="text-xs uppercase tracking-[0.16em] text-[#9A6D28] font-semibold">
                  Período da Hospedagem & Destino
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#0F5257] bg-[#0F5257]/10 px-2.5 py-0.5 rounded-full border border-[#0F5257]/20">
                  {nightsCount} {nightsCount === 1 ? "diária" : "diárias"}
                </span>
                <span className="text-[11px] text-[#5C646B]">
                  • {totalGuestsCount} {totalGuestsCount === 1 ? "hóspede" : "hóspedes"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* 1. CAMPO DE BUSCA LIVRE DE DESTINO OU HOTEL */}
              <div className="sm:col-span-1 lg:col-span-4 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-2 sm:pb-0 lg:pr-3">
                <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#B8863B]" />
                  <span>Destino ou Hotel</span>
                </label>
                <div className="flex items-center gap-2 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D9C8] focus-within:border-[#B8863B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B8863B]/15 transition h-[38px]">
                  <Search className="w-3.5 h-3.5 text-[#B8863B] shrink-0" />
                  <input
                    type="text"
                    value={hotelBarSearchText}
                    onChange={(e) => {
                      setHotelBarSearchText(e.target.value);
                      setHeroSearchText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleExecuteHotelBarSearch();
                      }
                    }}
                    placeholder={
                      selectedHotel
                        ? `${selectedHotel.cityName} (${selectedHotel.stateCode}) — alterar destino ou hotel`
                        : "Destino ou hotel (Ex: Rio, Gramado...)"
                    }
                    className="w-full bg-transparent text-[#182026] text-xs font-medium placeholder:text-[#5C646B]/60 placeholder:font-normal focus:outline-none"
                  />
                  {hotelBarSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setHotelBarSearchText("");
                        setHeroSearchText("");
                      }}
                      className="p-0.5 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#EAE3D5] transition cursor-pointer shrink-0"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. DATAS DE CHECK-IN E CHECK-OUT */}
              <div className="sm:col-span-1 lg:col-span-5 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-2 sm:pb-0 lg:pr-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                      Check-in (Entrada)
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      min={getTodayString()}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        handleCheckInChange(newIn);
                        const hbDest = activeHotelbedsDestination.current;
                        const outDate = (!checkOutDate || newIn >= checkOutDate) ? addDaysToString(newIn, nightsCount > 0 ? nightsCount : 1) : checkOutDate;
                        fetchLiveHotelbedsHotels(hbDest, selectedCityId, newIn, outDate, adultsCount, childrenCount, undefined, selectedHotel.hotelbedsCode);
                      }}
                      className="w-full bg-[#FAF7F2] text-[#182026] text-xs font-medium px-2.5 py-2 rounded-xl border border-[#E2D9C8] focus:outline-none focus:border-[#B8863B] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                      Check-out (Saída)
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={addDaysToString(checkInDate, 1)}
                      onChange={(e) => {
                        const newOut = e.target.value;
                        handleCheckOutChange(newOut);
                        const hbDest = activeHotelbedsDestination.current;
                        fetchLiveHotelbedsHotels(hbDest, selectedCityId, checkInDate, newOut, adultsCount, childrenCount, undefined, selectedHotel.hotelbedsCode);
                      }}
                      className="w-full bg-[#FAF7F2] text-[#182026] text-xs font-medium px-2.5 py-2 rounded-xl border border-[#E2D9C8] focus:outline-none focus:border-[#B8863B] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SELETOR DE HÓSPEDES & BOTÃO PESQUISAR */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2">
                <div ref={hotelGuestsContainerRef} className="relative flex-1">
                  <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1">
                    Hóspedes
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsHotelGuestsOpen(!isHotelGuestsOpen)}
                    className={`w-full bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border flex items-center justify-between gap-1 transition cursor-pointer text-left ${
                      isHotelGuestsOpen
                        ? "border-[#B8863B] bg-white ring-2 ring-[#B8863B]/15"
                        : "border-[#E2D9C8] hover:border-[#B8863B]/70"
                    }`}
                  >
                    <span className="truncate font-medium text-xs">
                      {guestsSummaryLabel}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#5C646B] shrink-0 transition-transform duration-200 ${
                        isHotelGuestsOpen ? "rotate-180 text-[#B8863B]" : ""
                      }`}
                    />
                  </button>

                  {/* Popover de Hóspedes no Hotel */}
                  {isHotelGuestsOpen && (
                    <div className="absolute right-0 w-[290px] top-full mt-2 z-50 bg-white border border-[#D5C7B2] rounded-2xl shadow-xl p-4 space-y-3.5">
                      <div className="pb-2 border-b border-[#F0EAE0] flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-semibold">
                          Composição dos Hóspedes
                        </span>
                        <span className="text-xs text-[#5C646B]">
                          Total: <strong className="text-[#182026]">{totalGuestsCount}</strong>
                        </span>
                      </div>

                      {/* Adultos */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-[#182026] block">Adultos</span>
                          <span className="text-[10px] text-[#5C646B]">A partir de 18 anos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={adultsCount <= 1}
                            onClick={() => {
                              const nextA = Math.max(1, adultsCount - 1);
                              setAdultsCount(nextA);
                              const hbDest = activeHotelbedsDestination.current;
                              fetchLiveHotelbedsHotels(hbDest, selectedCityId, checkInDate, checkOutDate, nextA, childrenCount, undefined, selectedHotel.hotelbedsCode);
                            }}
                            className="w-7 h-7 rounded-lg border border-[#D5C7B2] bg-[#FAF7F2] text-[#182026] font-bold text-xs disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-semibold text-[#182026]">{adultsCount}</span>
                          <button
                            type="button"
                            disabled={adultsCount >= 8}
                            onClick={() => {
                              const nextA = Math.min(8, adultsCount + 1);
                              setAdultsCount(nextA);
                              const hbDest = activeHotelbedsDestination.current;
                              fetchLiveHotelbedsHotels(hbDest, selectedCityId, checkInDate, checkOutDate, nextA, childrenCount, undefined, selectedHotel.hotelbedsCode);
                            }}
                            className="w-7 h-7 rounded-lg border border-[#D5C7B2] bg-[#FAF7F2] text-[#182026] font-bold text-xs disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Crianças */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-[#182026] block">Crianças</span>
                          <span className="text-[10px] text-[#5C646B]">6 a 17 anos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={childrenCount <= 0}
                            onClick={() => {
                              const nextC = Math.max(0, childrenCount - 1);
                              setChildrenCount(nextC);
                              const hbDest = activeHotelbedsDestination.current;
                              fetchLiveHotelbedsHotels(hbDest, selectedCityId, checkInDate, checkOutDate, adultsCount, nextC, undefined, selectedHotel.hotelbedsCode);
                            }}
                            className="w-7 h-7 rounded-lg border border-[#D5C7B2] bg-[#FAF7F2] text-[#182026] font-bold text-xs disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-semibold text-[#182026]">{childrenCount}</span>
                          <button
                            type="button"
                            disabled={childrenCount >= 4}
                            onClick={() => {
                              const nextC = Math.min(4, childrenCount + 1);
                              setChildrenCount(nextC);
                              const hbDest = activeHotelbedsDestination.current;
                              fetchLiveHotelbedsHotels(hbDest, selectedCityId, checkInDate, checkOutDate, adultsCount, nextC, undefined, selectedHotel.hotelbedsCode);
                            }}
                            className="w-7 h-7 rounded-lg border border-[#D5C7B2] bg-[#FAF7F2] text-[#182026] font-bold text-xs disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center justify-between gap-2">
                        <span>
                          <span className="block text-xs font-semibold text-[#182026]">Infantil</span>
                          <span className="text-[10px] text-[#5C646B]">0 a 5 anos</span>
                        </span>
                        <select value={infantsCount} onChange={(event) => {
                          const infants = Number(event.target.value);
                          setInfantsCount(infants);
                          fetchLiveHotelbedsHotels(activeHotelbedsDestination.current, selectedCityId,
                            checkInDate, checkOutDate, adultsCount, childrenCount, undefined, selectedHotel.hotelbedsCode, infants);
                        }} className="rounded-lg border border-[#D5C7B2] bg-[#FAF7F2] px-2 py-1 text-xs">
                          {[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
                        </select>
                      </label>

                      <div className="pt-2 border-t border-[#F0EAE0]">
                        <button
                          type="button"
                          onClick={() => setIsHotelGuestsOpen(false)}
                          className="w-full py-1.5 rounded-lg bg-[#B8863B] text-white text-xs font-medium"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleExecuteHotelBarSearch()}
                    disabled={isHotelbedsLoading}
                    className="h-[38px] px-3.5 sm:px-4 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60 whitespace-nowrap"
                    title="Pesquisar Tarifas e Hotéis"
                  >
                    {isHotelbedsLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Pesquisar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          )}

          {/* Galeria com Carrossel Compacto & Elegante */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-8">
            <div className="lg:col-span-8 relative h-52 sm:h-72 lg:h-80 rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] shadow-sm">
              <LuxuryImage
                src={hotelAllPhotos[activePhotoIndex] || selectedHotel.heroImage}
                alt={selectedHotel.name}
                fallbackLabel={selectedHotel.name}
                priority
                className="w-full h-full"
              />
              <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none">
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev === 0 ? hotelAllPhotos.length - 1 : prev - 1
                    )
                  }
                  className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 text-[#182026] hover:text-[#B8863B] shadow-md flex items-center justify-center cursor-pointer"
                  disabled={hotelAllPhotos.length < 2}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) => (prev + 1) % hotelAllPhotos.length)
                  }
                  className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 text-[#182026] hover:text-[#B8863B] shadow-md flex items-center justify-center cursor-pointer"
                  disabled={hotelAllPhotos.length < 2}
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-3">
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
                {hotelAllPhotos.slice(0, 4).map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative h-14 sm:h-22 lg:h-28 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activePhotoIndex === idx
                        ? "border-[#B8863B] shadow-sm"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <LuxuryImage
                      src={imgUrl}
                      alt={`${selectedHotel.name} ${idx + 1}`}
                      priority
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-2.5">
                  Destaques da Curadoria
                </span>
                <ul className="space-y-2 text-xs text-[#465058]">
                  {selectedHotel.curationHighlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#B8863B] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Suítes & Comparador Claro */}
          <div className="space-y-4">
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026] mb-3 sm:mb-4">
              Suítes & Condições de Membro
            </h2>

            {isHotelbedsLoading && <p role="status">{SEARCH_LOADING_MESSAGE}</p>}
            {hotelbedsError && <p role="alert" className="text-[#B83B2B]">{hotelbedsError}</p>}
            {hotelbedsNotice && <p role="status" className="text-[#9A6D28]">{hotelbedsNotice}</p>}
            {!isHotelbedsLoading && !hotelbedsError && (!canBookSelectedHotel || !selectedHotel.rooms.length) &&
              <p>Nenhum quarto disponível para estas datas.</p>}
            {canBookSelectedHotel && selectedHotel.rooms.map((room) => {
              const cancelInfo = getRoomCancellationInfo(room);
              const roomPricing = calculateVellutoPricing(
                room.netRate,
                room.barRate,
                0.15,
                selectedHotel.cleaningFee || 0,
                selectedHotel.securityDeposit || 0
              );
              const card12x = roomPricing.creditCard.installments[11];
              const roomSoldOut = room.omnibeesAvailableCount <= 0 || Boolean(selectedHotel.stopSell);
              const roomPhoto = room.heroImage || "";

              return (
                <div
                  key={room.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5DEC9] hover:border-[#B8863B] shadow-xs transition grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-center"
                >
                  {/* Foto Real da Acomodação */}
                  <div className="lg:col-span-3 relative h-48 sm:h-52 lg:h-36 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#EAE3D5] shrink-0 group/rm">
                    <LuxuryImage
                      src={roomPhoto}
                      alt={room.name}
                      fallbackLabel={room.name}
                      priority={false}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/rm:scale-105"
                    />
                    <div className="absolute top-2 left-2 z-20 bg-[#182026]/85 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] text-white font-medium">
                      {room.sizeM2 > 0 ? `${room.sizeM2} m²` : null}
                    </div>
                  </div>

                  {/* Informações da Suíte */}
                  <div className="lg:col-span-4">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-[#9A6D28] font-semibold block">
                      {room.viewLabel}
                    </span>
                    <h3 className="font-editorial text-lg sm:text-xl font-normal text-[#182026] mt-0.5">
                      {room.name}
                    </h3>
                    <p className="text-xs text-[#5C646B] mt-1">
                      {[room.bedConfig, room.boardBasis].filter(Boolean).join(" • ")}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {room.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#465058]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    {/* Selos de Taxas Inclusas e Política de Cancelamento */}
                    <div className="mt-3 pt-2.5 border-t border-[#F0EAE0] space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-medium bg-[#0F5257]/8 text-[#0F5257] px-2 py-0.5 rounded-md border border-[#0F5257]/15">
                          <CheckCircle2 className="w-3 h-3 text-[#0F5257] shrink-0" />
                          <span>Taxas e ISS inclusos &bull; Sem surpresas no check-out</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md border ${cancelInfo.badgeClass}`}>
                          <RotateCcw className="w-3 h-3 shrink-0" />
                          <span>{cancelInfo.label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCancelPolicyText(cancelInfo.details);
                            setLegalModalTab("cancelamento");
                          }}
                          className="text-[10px] text-[#9A6D28] underline hover:text-[#182026] cursor-pointer"
                        >
                          Ver regras
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tarifas */}
                  <div className="lg:col-span-3 grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] tabular-price">
                    <div className="border-r border-[#E2D9C8] pr-2">
                      <span className="text-[9px] uppercase tracking-wider text-[#5C646B] block">
                        Tarifa Oficial
                      </span>
                      <span className="text-sm sm:text-base text-[#B83B2B] line-through block mt-0.5">
                        {formatBRL(roomPricing.barRate)}
                      </span>
                    </div>

                    <div className="pl-1">
                      <span className="text-[9px] uppercase tracking-wider text-[#9A6D28] font-medium block">
                        Tarifa Membro
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-[#0F5257] block mt-0.5">
                        {formatBRL(roomPricing.pix.pixPrice)}
                      </span>
                      <span className="text-[10px] text-[#0F5257] font-medium block">
                        -{formatBRL(roomPricing.pix.savingsVsBar)}/noite
                      </span>
                    </div>
                  </div>

                  {/* CTA Selecionar */}
                  <div className="lg:col-span-2 flex flex-col justify-center">
                    <button
                      disabled={roomSoldOut}
                      onClick={() => handleDirectCheckout(selectedHotel, room)}
                      className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl font-medium text-xs uppercase tracking-[0.1em] transition flex items-center justify-center gap-1.5 ${
                        roomSoldOut
                          ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                          : "bg-[#B8863B] hover:bg-[#9A6D28] text-white shadow-xs cursor-pointer"
                      }`}
                    >
                      <span>{roomSoldOut ? "Indisponível" : "Selecionar"}</span>
                      {!roomSoldOut && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[10px] text-center text-[#5C646B] mt-1 tabular-price block">
                      ou 12x de {formatBRLCents(card12x.installmentValue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* =====================================================================
          TELA 04: CHECKOUT EXPRESSO CLARO & ELEGANTE (< 90s)
         ===================================================================== */}
      {activeScreen === "checkout" && (
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-6 sm:py-10 w-full pb-28 lg:pb-10">
          <button
            onClick={() => setActiveScreen("hotel")}
            className="inline-flex items-center gap-2 text-xs text-[#9A6D28] font-medium hover:underline mb-4 sm:mb-5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para {selectedHotel.name}</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            <div className="lg:col-span-8 space-y-5 sm:space-y-6">
              {/* Alerta de Erro de Validação */}
              {checkoutError && (
                <div className="p-4 rounded-2xl bg-[#B83B2B]/10 border border-[#B83B2B]/30 text-xs sm:text-sm text-[#B83B2B] flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* 1. Titular da Reserva */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                      Hóspede Principal
                    </span>
                    <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                      1. Titular da Reserva
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#B8863B]/10 flex items-center justify-center text-[#9A6D28]">
                    <User className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Nome e Último Nome */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        Primeiro Nome *
                      </label>
                      <input
                        type="text"
                        value={primaryFirstName}
                        onChange={(e) => setPrimaryFirstName(e.target.value)}
                        placeholder="Ex: Pedro"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        Último Nome (Sobrenome) *
                      </label>
                      <input
                        type="text"
                        value={primaryLastName}
                        onChange={(e) => setPrimaryLastName(e.target.value)}
                        placeholder="Ex: Pereira"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>
                  </div>

                  {/* E-mail e Confirmação de E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        Confirmar o E-mail *
                      </label>
                      <input
                        type="email"
                        value={primaryEmailConfirm}
                        onChange={(e) => setPrimaryEmailConfirm(e.target.value)}
                        placeholder="Repita seu e-mail"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border text-sm text-[#182026] focus:outline-none ${
                          primaryEmailConfirm &&
                          primaryEmail.toLowerCase() !== primaryEmailConfirm.toLowerCase()
                            ? "border-[#B83B2B] focus:border-[#B83B2B]"
                            : "border-[#E2D9C8] focus:border-[#B8863B]"
                        }`}
                      />
                      {primaryEmailConfirm && (
                        <div className="mt-1">
                          {primaryEmail.toLowerCase() === primaryEmailConfirm.toLowerCase() ? (
                            <span className="text-[11px] text-[#0F5257] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#0F5257]" />
                              E-mails conferem
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#B83B2B] font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-[#B83B2B]" />
                              Os e-mails informados são diferentes
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* País, CPF, WhatsApp e Data de Nascimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        País de Residência *
                      </label>
                      <select
                        value={primaryCountry}
                        onChange={(e) => setPrimaryCountry(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      >
                        <option value="Brasil">🇧🇷 Brasil</option>
                        <option value="Portugal">🇵🇹 Portugal</option>
                        <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                        <option value="Argentina">🇦🇷 Argentina</option>
                        <option value="Uruguai">🇺🇾 Uruguai</option>
                        <option value="Chile">🇨🇱 Chile</option>
                        <option value="Espanha">🇪🇸 Espanha</option>
                        <option value="Outro">🌍 Outro país</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        CPF *
                      </label>
                      <input
                        type="text"
                        value={primaryCpf}
                        onChange={(e) => setPrimaryCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        WhatsApp *
                      </label>
                      <input
                        type="text"
                        value={primaryWhatsapp}
                        onChange={(e) => setPrimaryWhatsapp(formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        value={primaryBirthDate}
                        onChange={(e) => setPrimaryBirthDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Segundo Adulto (Acompanhante) */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block">
                      Acompanhante
                    </span>
                    <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                      2. Segundo Adulto
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#B8863B]/10 flex items-center justify-center text-[#9A6D28]">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-[#5C646B] mb-4">
                  Obrigatório para o registro e emissão do check-in hoteleiro (Ficha Nacional de Registro de Hóspedes - FNRH).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                      Primeiro Nome
                    </label>
                    <input
                      type="text"
                      value={secondGuestFirstName}
                      onChange={(e) => setSecondGuestFirstName(e.target.value)}
                      placeholder="Ex: Maria"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                      Último Nome
                    </label>
                    <input
                      type="text"
                      value={secondGuestLastName}
                      onChange={(e) => setSecondGuestLastName(e.target.value)}
                      placeholder="Ex: Pereira"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                      CPF ou Documento
                    </label>
                    <input
                      type="text"
                      value={secondGuestCpf}
                      onChange={(e) => setSecondGuestCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={secondGuestBirthDate}
                      onChange={(e) => setSecondGuestBirthDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                    />
                  </div>
                </div>
              </div>

              {extraCheckoutGuests.length > 0 && (
                <div className="rounded-2xl border border-[#E5DEC9] bg-white p-5 space-y-4">
                  <h2 className="font-editorial text-xl text-[#182026]">Demais hóspedes</h2>
                  {extraCheckoutGuests.map(({ key, label, minAge, maxAge }) => {
                    const guest = extraGuestDetails[key] || { name: "", surname: "", age: "" };
                    const update = (field: "name" | "surname" | "age", value: string) =>
                      setExtraGuestDetails((current) => ({ ...current, [key]: { ...guest, [field]: value } }));
                    return (
                      <fieldset key={key} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <legend className="text-sm font-semibold">{label}</legend>
                        <input aria-label={`Nome de ${label}`} placeholder="Nome" value={guest.name} onChange={(e) => update("name", e.target.value)}
                          className="rounded-lg border border-[#E2D9C8] px-3 py-2 text-sm" />
                        <input aria-label={`Sobrenome de ${label}`} placeholder="Sobrenome" value={guest.surname} onChange={(e) => update("surname", e.target.value)}
                          className="rounded-lg border border-[#E2D9C8] px-3 py-2 text-sm" />
                        {minAge !== null && <input type="number" min={minAge} max={maxAge || undefined}
                          aria-label={`Idade de ${label} no dia da entrada`} placeholder="Idade na entrada" value={guest.age}
                          onChange={(e) => update("age", e.target.value)} className="rounded-lg border border-[#E2D9C8] px-3 py-2 text-sm" />}
                      </fieldset>
                    );
                  })}
                </div>
              )}

              {/* 3. Modalidade de Pagamento Mercado Pago */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-semibold block">
                      Checkout Transparente Seguro
                    </span>
                    <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                      3. Pagamento via Mercado Pago
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#009EE3]/10 text-[#009EE3] font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Mercado Pago
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Opção PIX */}
                  <div
                    onClick={() => {
                      if (activeOrderId || isProcessingCheckout) return;
                      setPaymentMethod("pix");
                      setMpPixData(null);
                    }}
                    className={`p-5 rounded-xl border-2 transition cursor-pointer ${
                      paymentMethod === "pix"
                        ? "bg-[#FAF7F2] text-[#182026] border-[#0F5257] shadow-xs"
                        : "bg-white text-[#5C646B] border-[#E5DEC9] hover:border-[#D8CBB8]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-[#182026]">
                        <QrCode className="w-4 h-4 text-[#0F5257]" />
                        <span>PIX Instantâneo</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#0F5257] font-semibold bg-[#0F5257]/10 px-2 py-0.5 rounded-full">
                        Aprovação Imediata
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-[#0F5257] mt-1 tabular-price">
                      {formatBRL(
                        activeRoomPricing.pix.pixPrice * nightsCount +
                          villaExtraFeesTotal
                      )}
                    </p>
                    <span className="text-[11px] text-[#5C646B] block mt-1">
                      Aprovação em segundos com QR Code dinâmico
                    </span>
                  </div>

                  {/* Opção Cartão de Crédito */}
                  <div
                    onClick={() => {
                      if (activeOrderId || isProcessingCheckout) return;
                      setPaymentMethod("card");
                      setMpPixData(null);
                    }}
                    className={`p-5 rounded-xl border-2 transition cursor-pointer ${
                      paymentMethod === "card"
                        ? "bg-[#FAF7F2] text-[#182026] border-[#B8863B] shadow-xs"
                        : "bg-white text-[#5C646B] border-[#E5DEC9] hover:border-[#D8CBB8]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-[#182026]">
                        <CreditCard className="w-4 h-4 text-[#B8863B]" />
                        <span>Cartão em até 12x</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium bg-[#B8863B]/10 px-2 py-0.5 rounded-full">
                        Até 12 parcelas
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-[#182026] mt-1 tabular-price">
                      {selectedInstallments}x de{" "}
                      {formatBRLCents(
                        (activeRoomPricing.creditCard.installments[selectedInstallments - 1]
                          .totalCharged *
                          nightsCount +
                          villaExtraFeesTotal) /
                          selectedInstallments
                      )}
                    </p>
                    <span className="text-[11px] text-[#5C646B] block mt-1">
                      Total: {formatBRL(
                        activeRoomPricing.creditCard.installments[selectedInstallments - 1]
                          .totalCharged * nightsCount + villaExtraFeesTotal
                      )}
                    </span>
                  </div>
                </div>

                {/* Campos Específicos para Cartão de Crédito */}
                {paymentMethod === "card" && (
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] mb-6 space-y-3.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#9A6D28] font-semibold block">
                      Dados do Cartão de Crédito
                    </span>

                    {/* Seletor de Parcelamento */}
                    <div>
                      <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                        Número de Parcelas *
                      </label>
                      <select
                        value={selectedInstallments}
                        onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                      >
                        {activeRoomPricing.creditCard.installments.map((inst) => {
                          const totalWithNights =
                            inst.totalCharged * nightsCount + villaExtraFeesTotal;
                          const perInstallment = totalWithNights / inst.installments;
                          return (
                            <option key={inst.installments} value={inst.installments}>
                              {inst.installments}x de {formatBRLCents(perInstallment)} — Total:{" "}
                              {formatBRLCents(totalWithNights)}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                          Número do Cartão *
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                          Nome impresso no Cartão *
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="COMO IMPRESSO NO CARTÃO"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D9C8] text-sm text-[#182026] uppercase focus:outline-none focus:border-[#B8863B]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                          Validade (MM/AA) *
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                          placeholder="12/29"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#5C646B] mb-1 font-medium">
                          Código CVV *
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Box de Exibição do QR Code PIX Mercado Pago */}
                {paymentMethod === "pix" && mpPixData && (
                  <div className="p-5 rounded-2xl bg-[#0F5257]/5 border-2 border-[#0F5257] mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F5257] uppercase tracking-wider">
                        <QrCode className="w-4 h-4" />
                        PIX Gerado com Sucesso via Mercado Pago
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#0F5257] text-white font-medium">
                        Expira em 30 min
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                      {/* Imagem do QR Code */}
                      <div className="p-3 bg-white rounded-xl border border-[#E2D9C8] shadow-sm shrink-0 flex flex-col items-center">
                        <img
                          src={
                            mpPixData.qrCodeBase64.startsWith("data:")
                              ? mpPixData.qrCodeBase64
                              : `data:image/png;base64,${mpPixData.qrCodeBase64}`
                          }
                          alt="QR Code PIX Mercado Pago"
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[10px] text-[#5C646B] mt-1.5">
                          Aponte a câmera do banco
                        </span>
                      </div>

                      {/* Código Copia e Cola */}
                      <div className="flex-1 w-full space-y-2">
                        <label className="block text-[11px] text-[#182026] font-medium">
                          Ou copie o código PIX Copia e Cola:
                        </label>
                        <div className="p-2.5 rounded-xl bg-white border border-[#E2D9C8] text-[11px] text-[#5C646B] font-mono break-all max-h-20 overflow-y-auto">
                          {mpPixData.qrCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(mpPixData.qrCode);
                            setMpPixCopied(true);
                            setTimeout(() => setMpPixCopied(false), 3000);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
                            mpPixCopied
                              ? "bg-[#0F5257] text-white"
                              : "bg-[#0F5257]/10 text-[#0F5257] hover:bg-[#0F5257] hover:text-white"
                          }`}
                        >
                          {mpPixCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Código PIX Copiado com Sucesso!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Código PIX Copia e Cola</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {webhookStatusText &&
                      (webhookStatusText.toLowerCase().includes("chave") ||
                        webhookStatusText.toLowerCase().includes("demonstração")) && (
                        <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-950">Aviso da Conta Mercado Pago:</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900">
                              Sua conta do Mercado Pago ainda não tem uma Chave Pix cadastrada.
                              Para aceitar pagamentos bancários reais, acesse o <strong>App Mercado Pago &gt; Perfil &gt; Chaves Pix</strong> e cadastre qualquer chave (aleatória, CPF, e-mail ou celular).
                            </p>
                          </div>
                        </div>
                    )}
                  </div>
                )}

                {/* Validação Obrigatória dos Termos e LGPD */}
                <div
                  id="terms-checkbox-section"
                  className={`p-4 rounded-xl border mb-5 transition ${
                    checkoutError && !acceptedTerms
                      ? "bg-red-50/80 border-red-300 ring-2 ring-red-400/20"
                      : "bg-[#FAF7F2] border-[#E2D9C8]"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (e.target.checked && checkoutError) setCheckoutError(null);
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-[#B8863B] accent-[#B8863B] cursor-pointer"
                    />
                    <span className="text-xs text-[#182026] leading-relaxed select-none">
                      Declaro que li e concordo com os{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCancelPolicyText(getRoomCancellationInfo(selectedRoom).details);
                          setLegalModalTab("termos");
                        }}
                        className="text-[#9A6D28] font-semibold underline hover:text-[#182026] cursor-pointer"
                      >
                        Termos e Condições Gerais
                      </button>
                      , as{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCancelPolicyText(getRoomCancellationInfo(selectedRoom).details);
                          setLegalModalTab("cancelamento");
                        }}
                        className="text-[#9A6D28] font-semibold underline hover:text-[#182026] cursor-pointer"
                      >
                        Políticas de Cancelamento
                      </button>{" "}
                      desta acomodação e a{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCancelPolicyText(getRoomCancellationInfo(selectedRoom).details);
                          setLegalModalTab("privacidade");
                        }}
                        className="text-[#9A6D28] font-semibold underline hover:text-[#182026] cursor-pointer"
                      >
                        Proteção de Dados (LGPD)
                      </button>
                      .
                    </span>
                  </label>
                  {checkoutError && !acceptedTerms && (
                    <p className="text-[11px] text-red-600 font-medium mt-1.5 pl-7">
                      * Campo obrigatório para validar sua contratação de hospedagem.
                    </p>
                  )}
                </div>

                {currentCheckoutQuote && !activeOrderId && (
                  <div className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 text-sm">
                    <strong>Total confirmado da estadia: {formatBRLCents(currentCheckoutQuote.amount)}</strong>
                    {paymentMethod === "card" && <p>{selectedInstallments}x de aproximadamente {formatBRLCents(currentCheckoutQuote.amount / selectedInstallments)}</p>}
                    {currentCheckoutQuote.conditions?.cancellationPolicy && (
                      <div className="mt-2">
                        <strong>{currentCheckoutQuote.conditions.cancellationPolicy.source === "hotel" ? "Cancelamento da tarifa do hotel" : "Política de cancelamento do Hóspede Club"}</strong>
                        {currentCheckoutQuote.conditions.cancellationPolicy.lines.map((rule, index) => <p key={index}>{rule}</p>)}
                      </div>
                    )}
                    {currentCheckoutQuote.conditions?.rateComments && (
                      <p className="mt-2 whitespace-pre-wrap">{currentCheckoutQuote.conditions.rateComments}</p>
                    )}
                  </div>
                )}
                {activeOrderId && webhookStatusText && (
                  <div role="status" className="rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] p-4 text-sm">
                    <p>{webhookStatusText}</p>
                    <p className="mt-1 break-all text-xs">Pedido {activeOrderId}</p>
                  </div>
                )}
                {!activeOrderId && (
                  <button onClick={handleConfirmBookingWithWebhook} disabled={isProcessingCheckout}
                    className="w-full py-4 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.14em] transition disabled:opacity-60">
                    {isProcessingCheckout ? "Processando..." : !currentCheckoutQuote ? "Conferir preço da estadia" :
                      paymentMethod === "pix" ? "Gerar Pix" : "Pagar com cartão"}
                  </button>
                )}
              </div>

              {/* 4. Voucher Confirmado & Status de Gravação no PostgreSQL */}
              {bookingConfirmedVoucher && confirmedStay && (
                <div
                  id="booking-confirmation-section"
                  className="p-6 rounded-2xl bg-white text-[#182026] border-2 border-[#0F5257] shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F5257] font-semibold block">
                      Voucher Oficial Emitido
                    </span>
                    {postgresSavedStatus && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F5257]/10 text-[#0F5257] text-[10px] font-semibold">
                        <Database className="w-3 h-3" />
                        Salvo no PostgreSQL (Easypanel)
                      </span>
                    )}
                  </div>

                  <h3 className="font-editorial text-3xl text-[#182026] font-normal">
                    {bookingConfirmedVoucher}
                  </h3>
                  {webhookStatusText && (
                    <p className="text-xs text-[#0F5257] font-medium">{webhookStatusText}</p>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#5C646B] space-y-1.5">
                    <strong className="block text-sm text-[#182026]">{confirmedStay.hotelName} · {confirmedStay.roomName}</strong>
                    <p>Entrada: {confirmedStay.checkIn} · Saída: {confirmedStay.checkOut}</p>
                    <p>Titular: {confirmedStay.holder}</p>

                    {/* Cláusula Legal Obrigatória do Fornecedor para Certificação Hotelbeds APItude */}
                    {bookingSupplierRemarks && <div className="mt-2 pt-2 border-t border-[#EAE3D5] text-[10px] text-[#7A828A] leading-relaxed">
                      <strong className="text-[#182026] block mb-0.5">Nota Legal do Fornecedor (Supplier Notice):</strong>
                      {bookingSupplierRemarks}
                    </div>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#EAE3D5]">
                    <button type="button" onClick={() => {
                      try { if (customerCheckoutStorageKey) sessionStorage.removeItem(customerCheckoutStorageKey); } catch {}
                      setActiveOrderId("");
                      setCheckoutState("");
                      setCheckoutQuote(null);
                      setBookingConfirmedVoucher(null);
                      setConfirmedStay(null);
                      setWebhookStatusText(null);
                      goHome();
                    }} className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-xs text-[#182026]">
                      Buscar outra hospedagem
                    </button>
                    <a
                      href={`/api/bookings/voucher?orderId=${encodeURIComponent(activeOrderId)}`}
                      className="px-4 py-2 rounded-xl bg-[#B8863B] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar voucher PDF</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:col-span-4">
              <div className="p-4 sm:p-6 rounded-2xl bg-white text-[#182026] border border-[#E5DEC9] shadow-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium">
                  Resumo da Estadia
                </span>
                <h3 className="font-editorial text-2xl font-normal mt-1 text-[#182026]">
                  {selectedHotel.name}
                </h3>
                <p className="text-xs text-[#5C646B] mt-0.5">
                  {selectedRoom.name} • {nightsCount} Noites • {guestsSummaryLabel}
                </p>

                <div className="my-5 pt-4 border-t border-[#EAE3D5] space-y-2.5 text-xs tabular-price">
                  <div className="flex justify-between text-[#5C646B]">
                    <span>Tarifa Oficial ({nightsCount} noites)</span>
                    <span className="line-through text-[#B83B2B]">
                      {formatBRL(activeRoomPricing.barRate * nightsCount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#182026] font-medium">
                    <span>Tarifa Membro ({nightsCount} noites)</span>
                    <span>
                      {formatBRL(
                        (paymentMethod === "pix"
                          ? activeRoomPricing.pix.pixPrice
                          : activeRoomPricing.creditCard.installments[selectedInstallments - 1]
                              .totalCharged) * nightsCount
                      )}
                    </span>
                  </div>

                  {selectedHotel.accommodationType === "villa" && (
                    <>
                      <div className="flex justify-between text-[#5C646B]">
                        <span>Taxa de Limpeza da Propriedade</span>
                        <span>{formatBRL(selectedHotel.cleaningFee || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[#5C646B]">
                        <span>Caução Reembolsável</span>
                        <span>{formatBRL(selectedHotel.securityDeposit || 0)}</span>
                      </div>
                    </>
                  )}

                  {/* Detalhamento de Taxas e Impostos Inclusos */}
                  <div className="pt-2 border-t border-[#EAE3D5] space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center text-[#5C646B]">
                      <span>Impostos & ISS:</span>
                      <span className="text-[#0F5257] font-semibold">Inclusos (R$ 0,00)</span>
                    </div>
                    <div className="flex justify-between items-center text-[#5C646B]">
                      <span>Taxa de serviço hoteleiro:</span>
                      <span className="text-[#0F5257] font-semibold">Inclusa</span>
                    </div>
                    <div className="flex justify-between items-center text-[#5C646B] pt-0.5">
                      <span>Política da acomodação:</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getRoomCancellationInfo(selectedRoom).badgeClass}`}>
                        {getRoomCancellationInfo(selectedRoom).label}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EAE3D5] flex justify-between items-baseline">
                    <span className="text-xs uppercase tracking-wider text-[#9A6D28] font-medium">
                      Total
                    </span>
                    <span className="text-2xl font-semibold text-[#0F5257]">
                      {formatBRL(
                        (paymentMethod === "pix"
                          ? activeRoomPricing.pix.pixPrice
                          : activeRoomPricing.creditCard.installments[selectedInstallments - 1]
                              .totalCharged) *
                          nightsCount +
                          villaExtraFeesTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}

      {/* =====================================================================
          TELA 05: PORTAL GESTOR PROTEGIDO (CRM DE CLIENTES & OMNIBEES .ENV)
         ===================================================================== */}
      {activeScreen === "admin" && (
        <AdminOmnibeesPanel
          hotels={hotelsCatalog}
          onUpdateHotel={handleUpdateHotelFromExtranet}
          onAddHotel={handleAddHotelFromAdmin}
          onOpenHotelPreview={handleOpenHotelDetail}
          onOpenExtranetModal={() => setIsExtranetModalOpen(true)}
          onOpenPricingSimulator={() => setIsPricingDrawerOpen(true)}
          onOpenGovernanceModal={() => setIsCouncilModalOpen(true)}
          onExitAdmin={goHome}
        />
      )}



      {/* BARRA INFERIOR MOBILE CLARA & OTIMIZADA PARA RESERVAS (Oculta no checkout para foco total na compra) */}
      {activeScreen !== "checkout" && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E5DEC9] px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
            {/* Início */}
            <button
              onClick={() => {
                goHome();
                setShowFavoritesOnly(false);
              }}
              className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer touch-manipulation transition ${
                activeScreen === "home" && !showFavoritesOnly
                  ? "text-[#9A6D28] font-bold"
                  : "text-[#5C646B]"
              }`}
            >
              <Sparkles className="w-4 h-4 mb-0.5" />
              <span>Início</span>
            </button>

            {/* Salvos */}
            <button
              onClick={() => {
                setShowFavoritesOnly(true);
                goHome();
              }}
              className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer touch-manipulation relative transition ${
                showFavoritesOnly ? "text-[#B83B2B] font-bold" : "text-[#5C646B]"
              }`}
            >
              <div className="relative">
                <Heart className={`w-4 h-4 mb-0.5 ${showFavoritesOnly ? "fill-[#B83B2B]" : ""}`} />
                {favoriteIds.length > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#B83B2B] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {favoriteIds.length}
                  </span>
                )}
              </div>
              <span>Salvos</span>
            </button>

            {/* Clube / Seja Membro */}
            <button
              onClick={() => {
                if (!loggedCustomer) {
                  setAuthModalInitialMode("register");
                  setIsAuthModalOpen(true);
                } else {
                  setShowClubModal(true);
                }
              }}
              className="flex flex-col items-center justify-center py-1 text-[10px] text-[#5C646B] hover:text-[#9A6D28] cursor-pointer touch-manipulation transition"
            >
              <Users className="w-4 h-4 mb-0.5 text-[#B8863B]" />
              <span className="truncate max-w-[70px]">
                {loggedCustomer ? "Minha Conta" : "Seja Membro"}
              </span>
            </button>

            {/* Reserva */}
            <button
              onClick={() => setActiveScreen("checkout")}
              className="flex flex-col items-center justify-center py-1 text-[10px] text-[#5C646B] hover:text-[#9A6D28] cursor-pointer touch-manipulation transition"
            >
              <ShieldCheck className="w-4 h-4 mb-0.5 text-[#0F5257]" />
              <span>Reserva</span>
            </button>
          </div>
        </nav>
      )}

      {/* MODAL DE CADASTRO COMPLETO DO CLIENTE NO BACKEND (HÓSPEDE CLUB) */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-white text-[#182026] border border-[#DFD5C5] rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
              {loggedCustomer ? "Minha conta" : "Cadastro Oficial de Membro"}
            </span>
            <h3 className="font-editorial text-3xl font-normal text-[#182026]">
              Hóspede Club
            </h3>
            {loggedCustomer ? <CustomerBookings key={loggedCustomer.id} /> : <p className="text-xs text-[#5C646B] mt-1.5 leading-relaxed">
              Cadastre seus dados e preferências de viagem para receber tarifas e campanhas de membro.
            </p>}

            {/* Formulário de Cadastro do Cliente (Salvo no Backend /api/customers) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveMemberClubProfile("Cadastro Clube");
              }}
              className="space-y-3.5 my-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={guestFullName}
                    onChange={(e) => setGuestFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    WhatsApp (Com DDD)
                  </label>
                  <input
                    type="text"
                    value={guestWhatsapp}
                    onChange={(e) => setGuestWhatsapp(e.target.value)}
                    placeholder="+55 (11) 99999-0000"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    E-mail Principal
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="voce@email.com.br"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                    Cidade / Estado de Origem
                  </label>
                  <select
                    value={memberCityOrigin}
                    onChange={(e) => setMemberCityOrigin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#182026]"
                  >
                    <option value="São Paulo (SP)">São Paulo (SP)</option>
                    <option value="Brasília (DF)">Brasília (DF)</option>
                    <option value="Goiânia (GO)">Goiânia (GO)</option>
                    <option value="Rio de Janeiro (RJ)">Rio de Janeiro (RJ)</option>
                    <option value="Belo Horizonte (MG)">Belo Horizonte (MG)</option>
                    <option value="Curitiba (PR)">Curitiba (PR)</option>
                    <option value="Outra Capital">Outra Cidade / Estado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                  Perfil de Viagem Preferido
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Casal", "Família", "Villas & Grupos"] as const).map((prof) => (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => setMemberTravelProfile(prof)}
                      className={`py-2 px-2.5 rounded-xl text-xs border transition cursor-pointer ${
                        memberTravelProfile === prof
                          ? "bg-[#182026] text-white border-[#182026] font-medium"
                          : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8]"
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                  Destinos de Interesse para Campanhas de Membro
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DESTINATION_CITIES.map((city) => {
                    const selected = memberPreferredDestinations.includes(
                      city.shortName
                    );
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() =>
                          setMemberPreferredDestinations((prev) =>
                            prev.includes(city.shortName)
                              ? prev.filter((d) => d !== city.shortName)
                              : [...prev, city.shortName]
                          )
                        }
                        className={`px-2.5 py-1 rounded-full text-[11px] border transition cursor-pointer ${
                          selected
                            ? "bg-[#0F5257] text-white border-[#0F5257]"
                            : "bg-[#FAF7F2] text-[#5C646B] border-[#E2D9C8]"
                        }`}
                      >
                        {city.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs text-[#465058] cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberMarketingOptIn}
                  onChange={(e) => setMemberMarketingOptIn(e.target.checked)}
                  className="mt-0.5 accent-[#0F5257]"
                />
                <span>
                  Autorizo receber alertas de tarifas secretas e campanhas exclusivas de membro no WhatsApp e E-mail (LGPD).
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium text-xs uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Salvar Meu Cadastro & Desbloquear Tarifas
              </button>
            </form>

            {/* Login Social Rápido */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleSaveMemberClubProfile("Apple")}
                className="py-2 px-3 rounded-xl bg-[#182026] text-white font-medium text-[11px] cursor-pointer"
              >
                 Apple ID
              </button>
              <button
                type="button"
                onClick={() => handleSaveMemberClubProfile("Google")}
                className="py-2 px-3 rounded-xl bg-[#B8863B] text-white font-medium text-[11px] cursor-pointer"
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSaveMemberClubProfile("WhatsApp VIP")}
                className="py-2 px-3 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-[#182026] text-[11px] cursor-pointer"
              >
                WhatsApp
              </button>
            </div>

            {clubSavedNotice && (
              <p className="text-xs text-[#0F5257] font-medium mb-3">
                {clubSavedNotice}
              </p>
            )}

            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] mb-4 flex items-center justify-between text-xs">
              <span className="text-[#5C646B]">Privacidade & LGPD</span>
              <button
                type="button"
                onClick={() => {
                  setIsClubMember(false);
                  setFavoriteIds([]);
                  syncCustomerActivityToBackend("DELETE_ACCOUNT", {});
                  setAccountDeletedNotice("Cadastro e dados removidos do servidor.");
                }}
                className="inline-flex items-center gap-1 text-[#B83B2B] hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Conta</span>
              </button>
            </div>

            {accountDeletedNotice && (
              <p className="text-xs text-[#9A6D28] mb-3">{accountDeletedNotice}</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#EAE3D5] text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsClubMember(false);
                  setShowClubModal(false);
                }}
                className="text-[#5C646B] hover:text-[#182026] cursor-pointer"
              >
                Ver tarifa pública (BAR)
              </button>
              <button
                type="button"
                onClick={() => setShowClubModal(false)}
                className="text-[#9A6D28] font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <PricingSimulatorDrawer
        isOpen={isPricingDrawerOpen}
        onClose={() => setIsPricingDrawerOpen(false)}
        initialNetRate={selectedRoom.netRate}
        initialBarRate={selectedRoom.barRate}
      />
      <CouncilGovernanceModal
        isOpen={isCouncilModalOpen}
        onClose={() => setIsCouncilModalOpen(false)}
      />
      <ExtranetModal
        isOpen={isExtranetModalOpen}
        onClose={() => setIsExtranetModalOpen(false)}
        hotels={hotelsCatalog}
        onUpdateHotel={handleUpdateHotelFromExtranet}
      />

      <footer className="bg-[#F3EDE2] text-[#5C646B] border-t border-[#E3DACB] py-8 sm:py-10 px-3 sm:px-6 md:px-8 mt-12 pb-24 lg:pb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <span className="font-editorial text-xl tracking-[0.22em] text-[#182026] font-normal">
              HÓSPEDE CLUB
            </span>
            <p className="text-xs text-[#5C646B] mt-1">
              Hospedagens selecionadas com desconto exclusivo para você.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#5C646B]">
            <Link href="/termos" className="hover:text-[#9A6D28] transition underline font-medium">
              Termos e Condições
            </Link>
            <span className="text-[#182026]/15">•</span>
            <Link href="/cancelamento" className="hover:text-[#9A6D28] transition underline font-medium">
              Políticas de Cancelamento
            </Link>
            <span className="text-[#182026]/15">•</span>
            <Link href="/privacidade" className="hover:text-[#9A6D28] transition underline font-medium">
              Proteção de Dados (LGPD)
            </Link>
            <span className="text-[#182026]/15">•</span>
            <button
              onClick={() => {
                if (loggedCustomer) {
                  setShowClubModal(true);
                } else {
                  setAuthModalInitialMode("register");
                  setIsAuthModalOpen(true);
                }
              }}
              className="hover:text-[#9A6D28] cursor-pointer"
            >
              {loggedCustomer ? "Meu Perfil de Membro" : "Cadastrar no Hóspede Club"}
            </button>
            <span className="text-[#182026]/15">•</span>
            <span className="text-[11px] text-[#5C646B]/70">
              Ambiente Seguro • SSL 256-bit
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL OFICIAL DE LOGIN E CADASTRO COM CÓDIGO WHATSAPP */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalCheckoutNotice(undefined);
          setPendingCheckoutSelection(null);
        }}
        initialMode={authModalInitialMode}
        checkoutContextNotice={authModalCheckoutNotice}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* MODAL DE RENOVAÇÃO DE MEMBRO APÓS OS 7 DIAS (R$ 19,90/MÊS OU POR RESERVA) */}
      <MembershipRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        customerName={loggedCustomer?.fullName || memberName}
        onSubscribedSuccess={() => {
          if (loggedCustomer) {
            setLoggedCustomer({
              ...loggedCustomer,
              membership: {
                status: "SUBSCRIBED",
                trialStartedAt: loggedCustomer.membership?.trialStartedAt || new Date().toISOString(),
                trialExpiresAt: loggedCustomer.membership?.trialExpiresAt || new Date().toISOString(),
                daysRemaining: 30,
              },
            });
            setIsClubMember(true);
          }
        }}
        onBrowseHotels={() => {
          handleOpenDestination(selectedCityId);
        }}
      />

      {/* MODAL DE TERMOS, LGPD E POLÍTICAS DE CANCELAMENTO */}
      <LegalTermsModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || "termos"}
        onClose={() => setLegalModalTab(null)}
        hotelName={selectedHotel.name}
        cancellationText={selectedCancelPolicyText}
      />

      {/* POP-UP BLACK FRIDAY PRIVÉE HÓSPEDE CLUB (10s com timer e ofertas reais) */}
      <BlackFridayModal
        isOpen={isBlackFridayModalOpen}
        onClose={handleCloseBlackFriday}
        onSelectDestination={handleSelectBlackFridayDeal}
      />
    </div>
  );
}
