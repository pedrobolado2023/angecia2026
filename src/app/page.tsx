"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import { PricingSimulatorDrawer } from "@/components/PricingSimulatorDrawer";
import { CouncilGovernanceModal } from "@/components/CouncilGovernanceModal";
import { ExtranetModal } from "@/components/ExtranetModal";
import { LuxuryImage } from "@/components/LuxuryImage";
import { DestinationFolderCarousel } from "@/components/DestinationFolderCarousel";
import { AdminOmnibeesPanel } from "@/components/AdminOmnibeesPanel";
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
  Star,
  Plane,
  Compass,
  Calculator,
  Award,
  CreditCard,
  QrCode,
  ArrowLeft,
  Footprints,
  Car,
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
  Printer,
  Share2,
  Trash2,
  Search,
  AlertOctagon,
  Server,
  Copy,
  AlertCircle,
  Database,
  Calendar,
  User,
} from "lucide-react";

type ActiveScreen = "home" | "destination" | "hotel" | "checkout" | "admin";

export default function HospedeClubApp() {
  const [hotelsCatalog, setHotelsCatalog] = useState<CuratedHotel[]>(CURATED_HOTELS);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  const [selectedGeoOriginId, setSelectedGeoOriginId] = useState<"SP" | "GYN" | "BSB" | "RJ">("SP");
  const currentGeoProfile = useMemo(
    () => GEO_ORIGIN_PROFILES.find((p) => p.id === selectedGeoOriginId) || GEO_ORIGIN_PROFILES[0],
    [selectedGeoOriginId]
  );

  const [selectedClusterId, setSelectedClusterId] = useState<"all" | "cluster-1" | "cluster-2" | "cluster-3">("all");
  const [selectedCityId, setSelectedCityId] = useState<string>("rio-de-janeiro");
  const [accommodationTab, setAccommodationTab] = useState<"all" | "hotel" | "villa">("all");
  const [selectedLandmarkFilter, setSelectedLandmarkFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [checkInDate, setCheckInDate] = useState<string>("2026-11-13");
  const [nightsCount, setNightsCount] = useState<number>(3);
  const [guestsCount, setGuestsCount] = useState<number>(2);

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
      selectedHotel.rooms[0],
    [selectedHotel, selectedRoomId]
  );

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
  const [webhookStatusText, setWebhookStatusText] = useState<string | null>(null);

  const [isPricingDrawerOpen, setIsPricingDrawerOpen] = useState<boolean>(false);
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState<boolean>(false);
  const [isExtranetModalOpen, setIsExtranetModalOpen] = useState<boolean>(false);

  const [pushNotificationBanner, setPushNotificationBanner] = useState<string | null>(null);
  const [countdownTick, setCountdownTick] = useState<number>(0);
  const [fomoIndex, setFomoIndex] = useState<number>(0);
  const [showFomoToast, setShowFomoToast] = useState<boolean>(true);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fomoInterval = setInterval(() => {
      setFomoIndex((prev) => (prev + 1) % LIVE_FOMO_NOTIFICATIONS.length);
    }, 7500);
    return () => clearInterval(fomoInterval);
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
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const STATE_FULL_NAMES: Record<string, string> = {
    RJ: "rio de janeiro sudeste",
    AL: "alagoas nordeste maceio maragogi",
    PE: "pernambuco nordeste recife porto de galinhas",
    BA: "bahia nordeste salvador trancoso praia do forte",
    "CE / RN": "ceara rio grande do norte fortaleza natal jericoacoara pipa nordeste",
    RS: "rio grande do sul serra gaucha gramado canela bento goncalves sul",
    "SP / MG": "sao paulo minas gerais campos do jordao monte verde mantiqueira sudeste",
    SP: "sao paulo litoral norte ilhabela guaruja olimpia sudeste",
    GO: "goias centro oeste caldas novas rio quente pirenopolis",
    SC: "santa catarina sul florianopolis jurere balneario camboriu penha",
  };

  const filteredHotels = useMemo(() => {
    return hotelsCatalog.filter((h) => {
      if (showFavoritesOnly && !favoriteIds.includes(h.id)) return false;
      if (selectedClusterId !== "all" && h.clusterId !== selectedClusterId) return false;
      if (accommodationTab !== "all" && h.accommodationType !== accommodationTab) return false;
      if (searchQuery.trim() !== "") {
        const q = normalizeForSearch(searchQuery.trim());
        const stateExpanded = STATE_FULL_NAMES[h.stateCode] || "";
        const haystack = normalizeForSearch(
          `${h.name} ${h.cityName} ${h.stateCode} ${h.neighborhood} ${h.primaryLandmarkDistance} ${stateExpanded}`
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [hotelsCatalog, showFavoritesOnly, favoriteIds, selectedClusterId, accommodationTab, searchQuery]);

  const activeDestinationCity = useMemo(
    () => DESTINATION_CITIES.find((c) => c.id === selectedCityId) || DESTINATION_CITIES[0],
    [selectedCityId]
  );

  // =========================================================================
  // BUSCA INTELIGENTE (AUTOCOMPLETE) DE CIDADE, ESTADO OU HOTEL NO HERO
  // =========================================================================
  const heroSearchContainerRef = useRef<HTMLDivElement | null>(null);
  const heroSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [heroSearchText, setHeroSearchText] = useState<string>(
    `${DESTINATION_CITIES[0].name} (${DESTINATION_CITIES[0].stateCode})`
  );
  const [isTypingHeroSearch, setIsTypingHeroSearch] = useState<boolean>(false);
  const [isHeroDropdownOpen, setIsHeroDropdownOpen] = useState<boolean>(false);
  const [selectedHeroHotelId, setSelectedHeroHotelId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        heroSearchContainerRef.current &&
        !heroSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsHeroDropdownOpen(false);
        setIsTypingHeroSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const heroMatchingCities = useMemo(() => {
    const q = isTypingHeroSearch ? normalizeForSearch(heroSearchText.trim()) : "";
    if (!q) return DESTINATION_CITIES;
    return DESTINATION_CITIES.filter((city) => {
      const stateExpanded = STATE_FULL_NAMES[city.stateCode] || "";
      const haystack = normalizeForSearch(
        `${city.name} ${city.stateCode} ${city.tagline} ${city.subAreas.join(" ")} ${stateExpanded}`
      );
      return haystack.includes(q);
    });
  }, [heroSearchText, isTypingHeroSearch]);

  const heroMatchingHotels = useMemo(() => {
    const q = isTypingHeroSearch ? normalizeForSearch(heroSearchText.trim()) : "";
    if (!q) return hotelsCatalog;
    return hotelsCatalog.filter((hotel) => {
      const stateExpanded = STATE_FULL_NAMES[hotel.stateCode] || "";
      const haystack = normalizeForSearch(
        `${hotel.name} ${hotel.cityName} ${hotel.stateCode} ${hotel.neighborhood} ${hotel.accommodationType} ${stateExpanded}`
      );
      return haystack.includes(q);
    });
  }, [hotelsCatalog, heroSearchText, isTypingHeroSearch]);

  const handleSelectHeroCity = (city: (typeof DESTINATION_CITIES)[number]) => {
    setSelectedCityId(city.id);
    setSelectedHeroHotelId(null);
    setHeroSearchText(`${city.name} (${city.stateCode})`);
    setIsTypingHeroSearch(false);
    setIsHeroDropdownOpen(false);
  };

  const handleSelectHeroHotel = (hotel: CuratedHotel) => {
    setSelectedCityId(hotel.cityId);
    setSelectedHeroHotelId(hotel.id);
    setSelectedHotelId(hotel.id);
    setSelectedRoomId(hotel.rooms[0].id);
    setHeroSearchText(`${hotel.name} — ${hotel.cityName} (${hotel.stateCode})`);
    setIsTypingHeroSearch(false);
    setIsHeroDropdownOpen(false);
  };

  const handleExecuteHeroSearch = () => {
    setIsHeroDropdownOpen(false);
    if (selectedHeroHotelId) {
      const chosenHotel = hotelsCatalog.find((h) => h.id === selectedHeroHotelId);
      if (chosenHotel) {
        handleOpenHotelDetail(chosenHotel);
        return;
      }
    }
    if (isTypingHeroSearch && heroSearchText.trim() !== "") {
      if (heroMatchingCities.length > 0) {
        const topCity = heroMatchingCities[0];
        handleSelectHeroCity(topCity);
        handleOpenDestination(topCity.id);
        return;
      }
      if (heroMatchingHotels.length > 0) {
        const topHotel = heroMatchingHotels[0];
        handleSelectHeroHotel(topHotel);
        handleOpenHotelDetail(topHotel);
        return;
      }
    }
    handleOpenDestination(selectedCityId);
  };

  const destinationHotels = useMemo(() => {
    const byCity = hotelsCatalog.filter((h) => h.cityId === activeDestinationCity.id);
    const baseList = byCity.length > 0 ? byCity : hotelsCatalog;
    if (selectedLandmarkFilter === "all") return baseList;
    const matching = baseList.filter((h) =>
      h.landmarkDistances.some((d) => d.landmarkId === selectedLandmarkFilter)
    );
    return matching.length > 0 ? matching : baseList;
  }, [hotelsCatalog, activeDestinationCity, selectedLandmarkFilter]);

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
      setHeroSearchText(`${matchedCity.name} (${matchedCity.stateCode})`);
      setSelectedHeroHotelId(null);
      setIsTypingHeroSearch(false);
      syncCustomerActivityToBackend("SEARCH", {
        query: matchedCity.name,
        destinationName: `${matchedCity.name} (${matchedCity.stateCode})`,
        checkInDate,
        nights: nightsCount,
        guests: guestsCount,
      });
    }
    setSelectedLandmarkFilter("all");
    setActiveScreen("destination");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenHotelDetail = (hotel: CuratedHotel) => {
    setSelectedHotelId(hotel.id);
    setSelectedRoomId(hotel.rooms[0].id);
    setActivePhotoIndex(0);
    setBookingConfirmedVoucher(null);
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

  const handleDirectCheckout = (hotel: CuratedHotel, room?: RoomCategory) => {
    if (hotel.stopSell || hotel.omnibeesAvailableRooms <= 0) {
      return;
    }
    const chosenRoom = room || hotel.rooms[0];
    setSelectedHotelId(hotel.id);
    setSelectedRoomId(chosenRoom.id);
    setBookingConfirmedVoucher(null);
    setWebhookStatusText(null);
    setCheckoutError(null);
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleConfirmBookingWithWebhook = async () => {
    setCheckoutError(null);

    // 1. Validações do Titular
    if (!primaryFirstName.trim() || !primaryLastName.trim()) {
      setCheckoutError("Por favor, preencha o Nome e Último Nome do titular.");
      return;
    }
    if (!primaryEmail.trim()) {
      setCheckoutError("Por favor, informe o E-mail do titular.");
      return;
    }
    if (primaryEmail.trim().toLowerCase() !== primaryEmailConfirm.trim().toLowerCase()) {
      setCheckoutError("A confirmação de e-mail não confere com o e-mail digitado.");
      return;
    }
    if (!primaryCpf.trim() || primaryCpf.replace(/\D/g, "").length < 11) {
      setCheckoutError("Por favor, informe um CPF válido com 11 dígitos para o titular.");
      return;
    }
    if (!primaryWhatsapp.trim() || primaryWhatsapp.replace(/\D/g, "").length < 10) {
      setCheckoutError("Por favor, informe o WhatsApp do titular com DDD.");
      return;
    }
    if (!primaryBirthDate) {
      setCheckoutError("Por favor, informe a Data de Nascimento do titular.");
      return;
    }

    // 2. Validações de Cartão de Crédito
    if (paymentMethod === "card") {
      if (!cardNumber.trim() || cardNumber.replace(/\D/g, "").length < 13) {
        setCheckoutError("Por favor, informe o número completo do cartão de crédito.");
        return;
      }
      if (!cardHolder.trim()) {
        setCheckoutError("Por favor, informe o nome impresso no cartão de crédito.");
        return;
      }
      if (!cardExpiry.trim() || cardExpiry.replace(/\D/g, "").length < 4) {
        setCheckoutError("Por favor, informe a validade do cartão (MM/AA).");
        return;
      }
      if (!cardCvv.trim() || cardCvv.replace(/\D/g, "").length < 3) {
        setCheckoutError("Por favor, informe o código de segurança (CVV).");
        return;
      }
    }

    setIsProcessingCheckout(true);

    try {
      const generatedVoucher = `HC-${Math.floor(100000 + Math.random() * 900000)}-OMNI`;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomId: selectedRoom.id,
          nights: nightsCount,
          guests: guestsCount,
          checkInDate,
          paymentModality: paymentMethod === "pix" ? "PIX" : "CARD",
          installments: selectedInstallments,

          // Titular
          primaryFirstName,
          primaryLastName,
          primaryEmail,
          primaryEmailConfirm,
          primaryCountry,
          primaryCpf,
          primaryWhatsapp,
          primaryBirthDate,

          // Segundo Adulto
          secondGuestFirstName,
          secondGuestLastName,
          secondGuestCpf,
          secondGuestBirthDate,

          // Cartão de Crédito
          cardNumber: cardNumber.replace(/\D/g, ""),
          cardHolder,
          cardExpiry,
          cardCvv,

          voucherCode: generatedVoucher,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar reserva.");
      }

      setBookingConfirmedVoucher(data.voucherCode || generatedVoucher);
      setPostgresSavedStatus(Boolean(data.postgres?.saved));

      if (paymentMethod === "pix" && data.mercadoPago?.pix) {
        setMpPixData(data.mercadoPago.pix);
        setWebhookStatusText(
          "Código PIX gerado via Mercado Pago • Pague para confirmação instantânea"
        );
      } else {
        setWebhookStatusText(
          "Pagamento aprovado pelo Mercado Pago • Reserva salva no PostgreSQL"
        );
      }

      // Decrementa estoque local do quarto
      setHotelsCatalog((prev) =>
        prev.map((h) => {
          if (h.id !== selectedHotel.id) return h;
          const nextAvail = Math.max(0, h.omnibeesAvailableRooms - 1);
          return {
            ...h,
            omnibeesAvailableRooms: nextAvail,
            stopSell: nextAvail === 0,
            scarcityLabel:
              nextAvail === 0
                ? "Último quarto vendido • Stop Sell"
                : `Apenas ${nextAvail} suíte(s) restante(s) nesta tarifa`,
            rooms: h.rooms.map((r) =>
              r.id === selectedRoom.id
                ? { ...r, omnibeesAvailableCount: Math.max(0, r.omnibeesAvailableCount - 1) }
                : r
            ),
          };
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar a reserva.";
      setCheckoutError(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const activeScene = HERO_SCENES[heroSceneIndex];
  const hotelAllPhotos = useMemo(() => {
    const set = new Set([selectedHotel.heroImage, ...selectedHotel.gallery]);
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

      {/* TOP BAR SOLAR & ELEGANTE (100% VOLTADA AO CLIENTE — SEM DADOS INTERNOS) */}
      <div className="bg-[#F3EDE2] text-[#5C646B] border-b border-[#E3DACB] text-[11px] py-1.5 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          {/* Seletor Discreto de Origem por IP */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[#9A6D28] font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Partindo de:</span>
            </span>
            <div className="flex items-center gap-1">
              {GEO_ORIGIN_PROFILES.map((geo) => (
                <button
                  key={geo.id}
                  onClick={() => setSelectedGeoOriginId(geo.id)}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    selectedGeoOriginId === geo.id
                      ? "text-[#182026] bg-white border border-[#D8CBB8] font-medium shadow-2xs"
                      : "text-[#5C646B] hover:text-[#182026]"
                  }`}
                >
                  {geo.city}
                </button>
              ))}
            </div>
          </div>

          {/* Informações Exclusivas para o Hóspede / Membro */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[#0F5257] font-medium">
              <Sparkles className="w-3 h-3 text-[#B8863B]" />
              <span>Tarifas de Membro Verificadas • +3% Cashback no PIX</span>
            </span>
            <span className="text-[#182026]/15 hidden sm:inline">|</span>
            <button
              onClick={() => setShowClubModal(true)}
              className="text-[#9A6D28] font-medium hover:underline transition cursor-pointer flex items-center gap-1"
            >
              <Users className="w-3 h-3 text-[#B8863B]" />
              <span>
                {isClubMember
                  ? `Olá, ${memberName.split(" ")[0]} (Perfil Membro)`
                  : "Cadastrar no Hóspede Club"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* HEADER EDITORIAL CLARO & ILUMINADO (PEARL IVORY GLASS) */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md text-[#182026] border-b border-[#E5DEC9] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setActiveScreen("home");
              setShowFavoritesOnly(false);
              setMobileMenuOpen(false);
            }}
            className="text-left group cursor-pointer flex items-center gap-3 min-w-0"
          >
            <div className="w-9 h-9 rounded-full border border-[#B8863B] flex items-center justify-center bg-[#B8863B]/10 group-hover:bg-[#B8863B] group-hover:text-white transition shrink-0">
              <span className="font-editorial text-lg text-[#9A6D28] group-hover:text-white font-normal">
                H
              </span>
            </div>
            <div className="truncate">
              <span className="font-editorial text-xl sm:text-2xl tracking-[0.22em] text-[#182026] font-normal block leading-none truncate">
                HÓSPEDE CLUB
              </span>
              <span className="text-[9px] uppercase tracking-[0.22em] text-[#9A6D28] block mt-1 truncate">
                Hospedagens com Desconto
              </span>
            </div>
          </button>

          {/* Navegação Editorial Clara (Sem ferramentas internas expostas no topo) */}
          <nav className="hidden lg:flex items-center gap-7 text-xs tracking-wider uppercase">
            <button
              onClick={() => {
                setActiveScreen("home");
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
              onClick={() => setActiveScreen("destination")}
              className={`py-1 transition cursor-pointer border-b-2 ${
                activeScreen === "destination"
                  ? "text-[#9A6D28] border-[#B8863B] font-medium"
                  : "text-[#5C646B] border-transparent hover:text-[#182026]"
              }`}
            >
              Destinos ({activeDestinationCity.stateCode})
            </button>
            <button
              onClick={() => setActiveScreen("hotel")}
              className={`py-1 transition cursor-pointer border-b-2 ${
                activeScreen === "hotel"
                  ? "text-[#9A6D28] border-[#B8863B] font-medium"
                  : "text-[#5C646B] border-transparent hover:text-[#182026]"
              }`}
            >
              Propriedade & Suítes
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
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                setActiveScreen("home");
              }}
              className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer flex items-center gap-1.5 border ${
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
              <span className="hidden sm:inline text-[11px]">Salvos ({favoriteIds.length})</span>
            </button>

            <button
              onClick={() => setShowClubModal(true)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] tracking-wide flex items-center gap-1.5 transition cursor-pointer border ${
                isClubMember
                  ? "bg-[#0F5257] border-[#0F5257] text-white hover:bg-[#146B72] shadow-xs"
                  : "bg-[#B8863B] border-[#B8863B] text-white"
              }`}
            >
              {isClubMember ? (
                <>
                  <Unlock className="w-3 h-3 shrink-0 text-[#FFE599]" />
                  <span>Membro Private</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Cadastrar Membro</span>
                </>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#182026] hover:text-[#B8863B] cursor-pointer"
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
                  setActiveScreen("home");
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
                  setActiveScreen("destination");
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-left border ${
                  activeScreen === "destination"
                    ? "bg-[#B8863B] text-white border-[#B8863B] font-medium"
                    : "bg-[#FAF7F2] text-[#182026] border-[#E5DEC9]"
                }`}
              >
                Destinos ({activeDestinationCity.stateCode})
              </button>
              <button
                onClick={() => {
                  setActiveScreen("hotel");
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-left border ${
                  activeScreen === "hotel"
                    ? "bg-[#B8863B] text-white border-[#B8863B] font-medium"
                    : "bg-[#FAF7F2] text-[#182026] border-[#E5DEC9]"
                }`}
              >
                Propriedade & Suítes
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

      {/* FOLDER DIGITAL DESLIZANTE DE DESTINOS, IMAGENS, DESCONTOS E PERÍODOS */}
      <DestinationFolderCarousel
        selectedCityId={selectedCityId}
        activeScreen={activeScreen}
        onSelectDestination={handleOpenDestination}
      />

      {/* =====================================================================
          TELA 01: HOME SOLAR & RIVIERA DAYLIGHT (CLARA, BONITA E CHAMATIVA)
         ===================================================================== */}
      {activeScreen === "home" && (
        <main className="flex-1">
          {/* HERO SECTION SOLAR & LUMINOSA */}
          <section className="relative z-20 bg-[#F3EDE2] text-[#182026] min-h-[520px] md:min-h-[570px] flex items-center border-b border-[#E5DEC9]">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <LuxuryImage
                src={activeScene.videoPoster}
                alt={activeScene.title}
                fallbackLabel={activeScene.title}
                className="w-full h-full opacity-95 animate-ken-burns"
              />
              {/* Gradiente Diurno Suave: Alabastro Luminoso à esquerda abrindo para a paisagem viva à direita */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2]/96 via-[#FAF7F2]/85 to-[#FAF7F2]/25" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-transparent to-white/20" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16 w-full">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#DFD5C5] text-[10px] uppercase tracking-[0.22em] text-[#9A6D28] font-medium shadow-2xs mb-4">
                  <Sparkles className="w-3 h-3 text-[#B8863B]" />
                  <span>Curadoria Privada • Hotelaria Nacional</span>
                </span>

                <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#182026] leading-[1.12]">
                  A arte de se hospedar no{" "}
                  <span className="italic text-[#B8863B]">extraordinário.</span>
                </h1>

                <p className="text-sm sm:text-base text-[#465058] mt-4 max-w-xl leading-relaxed font-normal">
                  Estadias singulares com tarifas secretas negociadas diretamente com os hotéis e resorts mais desejados do Brasil, até{" "}
                  <span className="text-[#0F5257] font-medium">27% abaixo da tarifa pública</span>.
                </p>

                {/* Seletor Solar de Cenas do Hero */}
                <div className="flex flex-wrap items-center gap-3 mt-6 text-xs">
                  {HERO_SCENES.map((scene, idx) => (
                    <button
                      key={scene.id}
                      onClick={() => setHeroSceneIndex(idx)}
                      className={`px-3 py-1.5 rounded-full border transition cursor-pointer ${
                        heroSceneIndex === idx
                          ? "bg-[#182026] border-[#182026] text-white shadow-xs"
                          : "bg-white/85 border-[#DFD5C5] text-[#5C646B] hover:border-[#B8863B] hover:text-[#182026]"
                      }`}
                    >
                      <span className="text-[#B8863B] font-medium mr-1.5">0{idx + 1}</span>
                      <span>{scene.location}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* BARRA DE BUSCA EM BRANCO PURO COM AUTOCOMPLETE DE CIDADE, ESTADO OU HOTEL */}
              <div className="mt-8 bg-white/95 backdrop-blur-xl border border-[#DED4C3] rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(24,32,38,0.12)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
                  <div
                    ref={heroSearchContainerRef}
                    className="relative sm:col-span-2 lg:col-span-4 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-3 sm:pb-0 lg:pr-4"
                  >
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1.5">
                      Destino ou Propriedade
                    </label>

                    <div
                      className={`flex items-center gap-2 bg-[#FAF7F2] px-3 py-2.5 rounded-xl border transition ${
                        isHeroDropdownOpen
                          ? "border-[#B8863B] bg-white ring-2 ring-[#B8863B]/15"
                          : "border-[#E2D9C8] hover:border-[#B8863B]/60"
                      }`}
                    >
                      <Search className="w-4 h-4 text-[#B8863B] shrink-0" />
                      <input
                        ref={heroSearchInputRef}
                        type="text"
                        value={heroSearchText}
                        onFocus={(e) => {
                          setIsHeroDropdownOpen(true);
                          e.currentTarget.select();
                        }}
                        onChange={(e) => {
                          setHeroSearchText(e.target.value);
                          setIsTypingHeroSearch(true);
                          setSelectedHeroHotelId(null);
                          setIsHeroDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleExecuteHeroSearch();
                          } else if (e.key === "Escape") {
                            setIsHeroDropdownOpen(false);
                          }
                        }}
                        placeholder="Digite cidade, estado ou hotel..."
                        className="w-full bg-transparent text-[#182026] text-xs sm:text-sm font-medium placeholder:text-[#5C646B]/60 placeholder:font-normal focus:outline-none"
                      />
                      {heroSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setHeroSearchText("");
                            setIsTypingHeroSearch(true);
                            setSelectedHeroHotelId(null);
                            setIsHeroDropdownOpen(true);
                            heroSearchInputRef.current?.focus();
                          }}
                          className="p-1 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#EAE3D5] transition cursor-pointer shrink-0"
                          title="Limpar e buscar outro destino ou hotel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* DROPDOWN POPOVER DE SUGESTÕES EM FUNDO CLARO & ELEGANTE */}
                    {isHeroDropdownOpen && (
                      <div className="absolute left-0 right-0 sm:w-[460px] lg:w-[500px] top-full mt-2.5 z-50 bg-white border border-[#D5C7B2] rounded-2xl shadow-[0_24px_60px_rgba(24,32,38,0.18)] overflow-hidden">
                        <div className="px-4 py-2.5 bg-[#FAF7F2] border-b border-[#EAE3D5] flex items-center justify-between gap-2 text-[11px] text-[#5C646B]">
                          <span>
                            {isTypingHeroSearch && heroSearchText.trim() !== ""
                              ? `Resultados para "${heroSearchText.trim()}"`
                              : "Sugestões de Cidades, Estados e Hotéis Curados"}
                          </span>
                          <span className="text-[#9A6D28] font-medium tabular-price">
                            {heroMatchingCities.length + heroMatchingHotels.length} opções
                          </span>
                        </div>

                        <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F0EAE0]">
                          {/* GRUPO 1: CIDADES, REGIÕES & ESTADOS */}
                          {heroMatchingCities.length > 0 && (
                            <div className="p-2">
                              <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium flex items-center justify-between">
                                <span>Cidades & Estados ({heroMatchingCities.length})</span>
                                <span className="text-[#5C646B]/70">Destinos</span>
                              </div>
                              <div className="space-y-1">
                                {heroMatchingCities.map((city) => {
                                  const isSelected =
                                    selectedCityId === city.id && !selectedHeroHotelId;
                                  return (
                                    <button
                                      key={city.id}
                                      type="button"
                                      onClick={() => handleSelectHeroCity(city)}
                                      className={`w-full px-3 py-2.5 rounded-xl text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                                        isSelected
                                          ? "bg-[#FAF7F2] border border-[#B8863B]"
                                          : "hover:bg-[#FAF7F2] border border-transparent"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-[#B8863B]/12 border border-[#B8863B]/30 flex items-center justify-center shrink-0 mt-0.5">
                                          <MapPin className="w-3.5 h-3.5 text-[#9A6D28]" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm text-[#182026] font-medium truncate">
                                              {city.name}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3EDE2] text-[#9A6D28] font-medium shrink-0">
                                              {city.stateCode}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-[#5C646B] truncate mt-0.5">
                                            {city.subAreas.join(" • ")}
                                          </p>
                                        </div>
                                      </div>

                                      <span className="text-[10px] text-[#0F5257] bg-[#0F5257]/10 border border-[#0F5257]/20 font-medium px-2 py-0.5 rounded-full shrink-0">
                                        Até -27%
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* GRUPO 2: HOTÉIS, RESORTS & VILLAS */}
                          {heroMatchingHotels.length > 0 && (
                            <div className="p-2">
                              <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium flex items-center justify-between">
                                <span>Hotéis & Villas ({heroMatchingHotels.length})</span>
                                <span className="text-[#5C646B]/70">Tarifa Membro</span>
                              </div>
                              <div className="space-y-1">
                                {heroMatchingHotels.map((hotel) => {
                                  const hotelPricing = calculateVellutoPricing(
                                    hotel.netRate,
                                    hotel.barRate,
                                    0.15,
                                    hotel.cleaningFee || 0,
                                    hotel.securityDeposit || 0
                                  );
                                  const isSelected = selectedHeroHotelId === hotel.id;
                                  return (
                                    <button
                                      key={hotel.id}
                                      type="button"
                                      onClick={() => handleSelectHeroHotel(hotel)}
                                      className={`w-full px-3 py-2.5 rounded-xl text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                                        isSelected
                                          ? "bg-[#FAF7F2] border border-[#B8863B]"
                                          : "hover:bg-[#FAF7F2] border border-transparent"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-[#0F5257]/10 border border-[#0F5257]/25 flex items-center justify-center shrink-0 mt-0.5">
                                          {hotel.accommodationType === "villa" ? (
                                            <Home className="w-3.5 h-3.5 text-[#0F5257]" />
                                          ) : (
                                            <Building2 className="w-3.5 h-3.5 text-[#0F5257]" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-xs sm:text-sm text-[#182026] font-medium block truncate">
                                            {hotel.name}
                                          </span>
                                          <p className="text-[11px] text-[#5C646B] truncate mt-0.5">
                                            {hotel.neighborhood} • {hotel.cityName} ({hotel.stateCode})
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-semibold text-[#0F5257] tabular-price block">
                                          {formatBRL(hotelPricing.pix.pixPrice)}
                                        </span>
                                        <span className="text-[10px] text-[#5C646B] block">
                                          /noite
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ESTADO VAZIO SE NENHUM RESULTADO COMBINAR */}
                          {heroMatchingCities.length === 0 && heroMatchingHotels.length === 0 && (
                            <div className="p-6 text-center">
                              <p className="text-xs text-[#5C646B]">
                                Nenhuma cidade, estado ou propriedade encontrada para &ldquo;{heroSearchText}&rdquo;.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setHeroSearchText("");
                                  setIsTypingHeroSearch(true);
                                  heroSearchInputRef.current?.focus();
                                }}
                                className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#B8863B] text-white text-xs hover:bg-[#9A6D28] transition cursor-pointer"
                              >
                                Ver todos os destinos e hotéis
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-3 border-b sm:border-b-0 lg:border-r border-[#EAE3D5] pb-3 sm:pb-0 lg:pr-4">
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1.5">
                      Data & Estadia
                    </label>
                    <div className="flex items-center gap-2 text-xs text-[#182026]">
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border border-[#E2D9C8] focus:outline-none focus:border-[#B8863B] w-full"
                      />
                      <select
                        value={nightsCount}
                        onChange={(e) => setNightsCount(Number(e.target.value))}
                        className="bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border border-[#E2D9C8] cursor-pointer shrink-0"
                      >
                        <option value={2} className="bg-white">2 noites</option>
                        <option value={3} className="bg-white">3 noites</option>
                        <option value={5} className="bg-white">5 noites</option>
                        <option value={7} className="bg-white">7 noites</option>
                      </select>
                    </div>
                  </div>

                  <div className="lg:col-span-2 pb-2 sm:pb-0">
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium mb-1.5">
                      Hóspedes
                    </label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="bg-[#FAF7F2] text-[#182026] text-xs px-2.5 py-2 rounded-xl border border-[#E2D9C8] cursor-pointer w-full"
                    >
                      <option value={1} className="bg-white">1 Hóspede</option>
                      <option value={2} className="bg-white">2 Hóspedes</option>
                      <option value={4} className="bg-white">Família (4)</option>
                      <option value={6} className="bg-white">Villa (6+)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <button
                      onClick={handleExecuteHeroSearch}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.14em] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Explorar Tarifas</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO DE INTELIGÊNCIA GEOGRÁFICA POR IP (CARDS CLAROS E ILUMINADOS) */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                  Próximos a {currentGeoProfile.city}
                </span>
                <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-[#182026]">
                  {currentGeoProfile.weekendEscapeTitle}
                </h2>
              </div>

              <button
                onClick={() => setIsClubMember(!isClubMember)}
                className="self-start md:self-auto px-4 py-2 rounded-full border border-[#DFD5C5] bg-white text-xs text-[#182026] hover:border-[#B8863B] shadow-2xs transition cursor-pointer flex items-center gap-2"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentGeoProfile.recommendedCityIds.map((cityId) => {
                const city = DESTINATION_CITIES.find((c) => c.id === cityId);
                if (!city) return null;
                return (
                  <div
                    key={city.id}
                    onClick={() => handleOpenDestination(city.id)}
                    className="group rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] hover:border-[#B8863B] flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-xl transition duration-500"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <LuxuryImage
                        src={city.heroImage}
                        alt={city.name}
                        fallbackLabel={city.name}
                        className="w-full h-full group-hover:scale-105 transition duration-700"
                      />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20">
                        <span className="px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md text-[#182026] text-[10px] tracking-wider uppercase font-medium shadow-xs">
                          {city.flightTimeFromOrigins[selectedGeoOriginId]}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-[#B83B2B] text-white text-[10px] font-medium shadow-xs">
                          Até -{city.avgSavingsPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="p-5 bg-white flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium block">
                          {city.stateCode} • {city.regionTag}
                        </span>
                        <h3 className="font-editorial text-2xl font-normal text-[#182026] leading-snug mt-0.5">
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
                  {filteredHotels.map((hotel) => {
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
          TELA 02: PÁGINA DE DESTINO INTERATIVA (CLARA, SOLAR & ELEGANTE)
         ===================================================================== */}
      {activeScreen === "destination" && (
        <main className="flex-1">
          <section className="relative bg-[#F3EDE2] text-[#182026] py-12 sm:py-16 px-4 sm:px-6 md:px-8 overflow-hidden border-b border-[#E5DEC9]">
            <LuxuryImage
              src={activeDestinationCity.heroImage}
              alt={activeDestinationCity.name}
              fallbackLabel={activeDestinationCity.name}
              className="absolute inset-0 w-full h-full opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2]/96 via-[#FAF7F2]/85 to-white/30" />

            <div className="relative z-10 max-w-7xl mx-auto">
              <button
                onClick={() => setActiveScreen("home")}
                className="inline-flex items-center gap-2 text-xs text-[#9A6D28] font-medium hover:underline mb-4 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à tela inicial</span>
              </button>

              <span className="text-[11px] uppercase tracking-[0.2em] text-[#0F5257] font-medium block mb-1">
                {activeDestinationCity.regionTag} • {activeDestinationCity.flightTimeFromOrigins[selectedGeoOriginId]}
              </span>

              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-[#182026]">
                {activeDestinationCity.name}
              </h1>
              <p className="text-sm sm:text-base text-[#465058] max-w-2xl mt-2">
                {activeDestinationCity.tagline}
              </p>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10">
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium">
                    Guia de Localização
                  </span>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026] mt-0.5">
                    Pontos Turísticos & Proximidade Real
                  </h2>
                </div>
                {selectedLandmarkFilter !== "all" && (
                  <button
                    onClick={() => setSelectedLandmarkFilter("all")}
                    className="px-3.5 py-1.5 rounded-full bg-[#B8863B] text-white text-xs cursor-pointer shadow-2xs"
                  >
                    Ver todos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {activeDestinationCity.landmarks.map((lm) => {
                  const isSelected = selectedLandmarkFilter === lm.id;
                  return (
                    <div
                      key={lm.id}
                      onClick={() =>
                        setSelectedLandmarkFilter(isSelected ? "all" : lm.id)
                      }
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-[#F3EDE2] text-[#182026] border-[#B8863B] shadow-sm"
                          : "bg-white text-[#182026] border-[#E5DEC9] hover:border-[#B8863B]"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block">
                        {lm.category} • {lm.coordinatesLabel}
                      </span>
                      <h3 className="font-editorial text-xl font-normal mt-0.5">{lm.name}</h3>
                      <p className="text-xs text-[#5C646B] mt-1">{lm.highlight}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {destinationHotels.map((hotel) => {
                const pricing = calculateVellutoPricing(hotel.netRate, hotel.barRate, 0.15);
                return (
                  <div
                    key={hotel.id}
                    className="rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden shadow-sm hover:shadow-md transition grid grid-cols-1 lg:grid-cols-12"
                  >
                    <div className="lg:col-span-4 relative min-h-[230px]">
                      <LuxuryImage
                        src={hotel.heroImage}
                        alt={hotel.name}
                        fallbackLabel={hotel.name}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="lg:col-span-5 p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9A6D28] font-medium">
                          {hotel.neighborhood}
                        </span>
                        <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026] mt-0.5">
                          {hotel.name}
                        </h3>
                        <p className="text-xs text-[#5C646B] mt-1">{hotel.subtitle}</p>

                        <div className="mt-4 p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-2">
                          {hotel.landmarkDistances.map((dist, idx) => {
                            const isHighlighted =
                              selectedLandmarkFilter !== "all" &&
                              dist.landmarkId === selectedLandmarkFilter;
                            return (
                              <div
                                key={idx}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs p-1 rounded ${
                                  isHighlighted ? "bg-[#B8863B]/15 font-medium" : ""
                                }`}
                              >
                                <span className="flex items-center gap-1.5 text-[#182026]">
                                  {dist.walkOrDrive === "walk" ? (
                                    <Footprints className="w-3.5 h-3.5 text-[#9A6D28] shrink-0" />
                                  ) : (
                                    <Car className="w-3.5 h-3.5 text-[#9A6D28] shrink-0" />
                                  )}
                                  <span>{dist.landmarkName}</span>
                                </span>
                                <span className="text-[#0F5257] font-medium">{dist.distanceText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 p-6 bg-[#FAF7F2] border-t lg:border-t-0 lg:border-l border-[#EAE3D5] flex flex-col justify-between">
                      <div className="tabular-price">
                        <span className="text-xs text-[#5C646B] line-through block">
                          Oficial {formatBRL(pricing.barRate)}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium block mt-2">
                          Tarifa Membro
                        </span>
                        <p className="text-2xl font-semibold text-[#0F5257] mt-0.5">
                          {formatBRL(pricing.pix.pixPrice)}
                        </p>
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-[#0F5257]/10 text-[#0F5257] text-xs font-medium">
                          Economia de {formatBRL(pricing.pix.savingsVsBar)}/noite
                        </span>
                      </div>

                      <div className="space-y-2 mt-6">
                        <button
                          onClick={() => handleDirectCheckout(hotel)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.12em] shadow-xs transition cursor-pointer"
                        >
                          Reservar Agora
                        </button>
                        <button
                          onClick={() => handleOpenHotelDetail(hotel)}
                          className="w-full py-2 px-4 rounded-xl bg-white border border-[#DFD5C5] hover:border-[#B8863B] text-[#182026] text-xs transition cursor-pointer"
                        >
                          Ver Suítes ({hotel.rooms.length})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* =====================================================================
          TELA 03: PÁGINA DO HOTEL (CARROSSEL INTERATIVO + COMPARADOR SUÍTES)
         ===================================================================== */}
      {activeScreen === "hotel" && (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 w-full">
          <button
            onClick={() => setActiveScreen("home")}
            className="inline-flex items-center gap-2 text-xs text-[#9A6D28] font-medium hover:underline mb-5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a tela inicial</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
                {selectedHotel.neighborhood} • {selectedHotel.cityName} ({selectedHotel.stateCode})
              </span>
              <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-[#182026]">
                {selectedHotel.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#5C646B] mt-1.5">
                {selectedHotel.primaryLandmarkDistance}
              </p>
            </div>

            <div className="px-3.5 py-2 rounded-full bg-[#B83B2B]/10 border border-[#B83B2B]/25 text-xs text-[#B83B2B] font-medium">
              {selectedHotel.scarcityLabel}
            </div>
          </div>

          {/* Galeria com Carrossel Claro */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-10">
            <div className="lg:col-span-8 relative h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-white border border-[#E5DEC9] shadow-sm">
              <LuxuryImage
                src={hotelAllPhotos[activePhotoIndex] || selectedHotel.heroImage}
                alt={selectedHotel.name}
                fallbackLabel={selectedHotel.name}
                className="w-full h-full"
              />
              <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none">
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev === 0 ? hotelAllPhotos.length - 1 : prev - 1
                    )
                  }
                  className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 text-[#182026] hover:text-[#B8863B] shadow-md flex items-center justify-center cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) => (prev + 1) % hotelAllPhotos.length)
                  }
                  className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 text-[#182026] hover:text-[#B8863B] shadow-md flex items-center justify-center cursor-pointer"
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-3 lg:grid-cols-2 gap-2.5">
                {hotelAllPhotos.slice(0, 4).map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative h-20 sm:h-28 lg:h-36 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activePhotoIndex === idx
                        ? "border-[#B8863B] shadow-sm"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <LuxuryImage
                      src={imgUrl}
                      alt={`${selectedHotel.name} ${idx + 1}`}
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
            <h2 className="font-editorial text-3xl font-normal text-[#182026] mb-4">
              Suítes & Condições de Membro
            </h2>

            {selectedHotel.rooms.map((room) => {
              const roomPricing = calculateVellutoPricing(
                room.netRate,
                room.barRate,
                0.15,
                selectedHotel.cleaningFee || 0,
                selectedHotel.securityDeposit || 0
              );
              const card12x = roomPricing.creditCard.installments[11];
              const roomSoldOut = room.omnibeesAvailableCount <= 0 || Boolean(selectedHotel.stopSell);

              return (
                <div
                  key={room.id}
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5DEC9] hover:border-[#B8863B] shadow-xs transition grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
                >
                  <div className="lg:col-span-5">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[#9A6D28] font-medium block">
                      {room.sizeM2} m² • {room.viewLabel}
                    </span>
                    <h3 className="font-editorial text-2xl font-normal text-[#182026] mt-0.5">
                      {room.name}
                    </h3>
                    <p className="text-xs text-[#5C646B] mt-1">
                      {room.bedConfig} • {room.boardBasis}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {room.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#465058]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] tabular-price">
                    <div className="border-r border-[#E2D9C8] pr-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#5C646B] block">
                        Tarifa Oficial
                      </span>
                      <span className="text-lg text-[#B83B2B] line-through block mt-0.5">
                        {formatBRL(roomPricing.barRate)}
                      </span>
                    </div>

                    <div className="pl-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#9A6D28] font-medium block">
                        Tarifa Membro
                      </span>
                      <span className="text-xl font-semibold text-[#0F5257] block mt-0.5">
                        {formatBRL(roomPricing.pix.pixPrice)}
                      </span>
                      <span className="text-[11px] text-[#0F5257] font-medium block">
                        -{formatBRL(roomPricing.pix.savingsVsBar)}/noite
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-3 flex flex-col justify-end">
                    <button
                      disabled={roomSoldOut}
                      onClick={() => handleDirectCheckout(selectedHotel, room)}
                      className={`w-full py-3 px-5 rounded-xl font-medium text-xs uppercase tracking-[0.12em] transition flex items-center justify-center gap-2 ${
                        roomSoldOut
                          ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                          : "bg-[#B8863B] hover:bg-[#9A6D28] text-white shadow-xs cursor-pointer"
                      }`}
                    >
                      <span>{roomSoldOut ? "Indisponível" : "Selecionar Suíte"}</span>
                      {!roomSoldOut && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="text-[11px] text-center text-[#5C646B] mt-1.5 tabular-price">
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
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 w-full">
          <button
            onClick={() => setActiveScreen("hotel")}
            className="inline-flex items-center gap-2 text-xs text-[#9A6D28] font-medium hover:underline mb-5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para {selectedHotel.name}</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {/* Alerta de Erro de Validação */}
              {checkoutError && (
                <div className="p-4 rounded-2xl bg-[#B83B2B]/10 border border-[#B83B2B]/30 text-xs sm:text-sm text-[#B83B2B] flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* 1. Titular da Reserva */}
              <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
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
              <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
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

              {/* 3. Modalidade de Pagamento Mercado Pago */}
              <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] shadow-xs">
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
                        +3% Cashback
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
                          src={`data:image/png;base64,${mpPixData.qrCodeBase64}`}
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
                  </div>
                )}

                {/* Botão de Fechar Reserva */}
                <button
                  onClick={handleConfirmBookingWithWebhook}
                  disabled={isProcessingCheckout}
                  className="w-full py-4 px-5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.14em] shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isProcessingCheckout ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando no Mercado Pago & Gravando no PostgreSQL...</span>
                    </div>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {paymentMethod === "pix"
                          ? `Gerar PIX Mercado Pago & Fechar Reserva (${nightsCount} Noites)`
                          : `Pagar com Cartão & Fechar Reserva (${nightsCount} Noites)`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* 4. Voucher Confirmado & Status de Gravação no PostgreSQL */}
              {bookingConfirmedVoucher && (
                <div className="p-6 rounded-2xl bg-white text-[#182026] border-2 border-[#0F5257] shadow-md space-y-4">
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

                  <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs text-[#5C646B] space-y-1">
                    <p>
                      <strong>Titular:</strong> {primaryFirstName} {primaryLastName} ({primaryEmail})
                    </p>
                    <p>
                      <strong>CPF:</strong> {primaryCpf} • <strong>WhatsApp:</strong> {primaryWhatsapp}
                    </p>
                    {secondGuestFirstName && (
                      <p>
                        <strong>Segundo Adulto:</strong> {secondGuestFirstName} {secondGuestLastName}
                        {secondGuestCpf ? ` (CPF: ${secondGuestCpf})` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#EAE3D5]">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-[#B8863B] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Salvar Voucher PDF</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Voucher Hóspede Club [${bookingConfirmedVoucher}] confirmado para ${selectedHotel.name}. Titular: ${primaryFirstName} ${primaryLastName}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-[#182026] text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:col-span-4">
              <div className="p-6 rounded-2xl bg-white text-[#182026] border border-[#E5DEC9] shadow-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium">
                  Resumo da Estadia
                </span>
                <h3 className="font-editorial text-2xl font-normal mt-1 text-[#182026]">
                  {selectedHotel.name}
                </h3>
                <p className="text-xs text-[#5C646B] mt-0.5">
                  {selectedRoom.name} • {nightsCount} Noites
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
          onExitAdmin={() => setActiveScreen("home")}
        />
      )}

      {/* PROVA SOCIAL CLARA & DISCRETA */}
      {showFomoToast && (
        <div className="fixed bottom-20 lg:bottom-5 left-3 right-3 sm:left-5 sm:right-auto z-30 sm:max-w-xs bg-white/95 backdrop-blur-md text-[#182026] border border-[#DFD5C5] rounded-2xl p-3.5 shadow-xl flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#B8863B]/15 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-3.5 h-3.5 text-[#9A6D28]" />
          </div>
          <div className="text-[11px] flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#9A6D28] font-medium">
                Hóspede Club
              </span>
              <button
                onClick={() => setShowFomoToast(false)}
                className="text-[#5C646B] hover:text-[#182026] text-xs cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-[#465058] mt-0.5 leading-snug line-clamp-2">
              {LIVE_FOMO_NOTIFICATIONS[fomoIndex]}
            </p>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR MOBILE CLARA */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E5DEC9] px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          <button
            onClick={() => {
              setActiveScreen("home");
              setShowFavoritesOnly(false);
            }}
            className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer ${
              activeScreen === "home" && !showFavoritesOnly
                ? "text-[#9A6D28] font-medium"
                : "text-[#5C646B]"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveScreen("destination")}
            className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer ${
              activeScreen === "destination" ? "text-[#9A6D28] font-medium" : "text-[#5C646B]"
            }`}
          >
            <Compass className="w-4 h-4 mb-0.5" />
            <span>Destinos</span>
          </button>

          <button
            onClick={() => setActiveScreen("hotel")}
            className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer ${
              activeScreen === "hotel" ? "text-[#9A6D28] font-medium" : "text-[#5C646B]"
            }`}
          >
            <Building2 className="w-4 h-4 mb-0.5" />
            <span>Suítes</span>
          </button>

          <button
            onClick={() => {
              setShowFavoritesOnly(true);
              setActiveScreen("home");
            }}
            className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer ${
              showFavoritesOnly ? "text-[#9A6D28] font-medium" : "text-[#5C646B]"
            }`}
          >
            <Heart className="w-4 h-4 mb-0.5" />
            <span>Salvos</span>
          </button>

          <button
            onClick={() => setActiveScreen("checkout")}
            className={`flex flex-col items-center justify-center py-1 text-[10px] cursor-pointer ${
              activeScreen === "checkout" ? "text-[#9A6D28] font-medium" : "text-[#5C646B]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 mb-0.5" />
            <span>Reserva</span>
          </button>
        </div>
      </nav>

      {/* MODAL DE CADASTRO COMPLETO DO CLIENTE NO BACKEND (HÓSPEDE CLUB) */}
      {showClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-white text-[#182026] border border-[#DFD5C5] rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
              Cadastro Oficial de Membro • Salvo no Servidor
            </span>
            <h3 className="font-editorial text-3xl font-normal text-[#182026]">
              Hóspede Club
            </h3>
            <p className="text-xs text-[#5C646B] mt-1.5 leading-relaxed">
              Cadastre seus dados e preferências de viagem para desbloquear tarifas secretas (até 28% OFF) e receber campanhas exclusivas de membro.
            </p>

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

      <footer className="bg-[#F3EDE2] text-[#5C646B] border-t border-[#E3DACB] py-10 px-4 sm:px-6 md:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="font-editorial text-xl tracking-[0.22em] text-[#182026] font-normal">
              HÓSPEDE CLUB
            </span>
            <p className="text-xs text-[#5C646B] mt-1">
              Hospedagens selecionadas com desconto exclusivo para você.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C646B]">
            <button
              onClick={() => setShowClubModal(true)}
              className="hover:text-[#9A6D28] cursor-pointer"
            >
              Cadastro Hóspede Club
            </button>
            <span className="text-[#182026]/15">•</span>
            <button
              onClick={() => {
                setActiveScreen("admin");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 text-[#5C646B] hover:text-[#0F5257] cursor-pointer"
            >
              <Lock className="w-3 h-3 text-[#9A6D28]" />
              <span>Portal Gestor (Acesso Restrito)</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
