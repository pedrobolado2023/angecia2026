"use client";

import React, { useState, useEffect, useRef } from "react";
import { LuxuryImage } from "@/components/LuxuryImage";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowUpRight,
} from "lucide-react";

export interface DestinationPromoFolder {
  cityId: string;
  stateCode: string;
  destinationName: string;
  propertySpotlight: string;
  periodLabel: string;
  discountPercent: number;
  barPrice: number;
  memberPrice: number;
  image: string;
  theme: "rio" | "beach" | "mountain" | "villa" | "thermal";
}

export const FICTIONAL_DESTINATION_FOLDERS: DestinationPromoFolder[] = [
  {
    cityId: "rio-de-janeiro",
    stateCode: "RJ",
    destinationName: "Rio, São Conrado & Búzios",
    propertySpotlight: "Palácio Atlântico & Península",
    periodLabel: "14 Nov – 18 Dez",
    discountPercent: 28,
    barPrice: 2400,
    memberPrice: 1728,
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=900&q=80",
    theme: "rio",
  },
  {
    cityId: "maceio-maragogi",
    stateCode: "AL",
    destinationName: "Maceió & Maragogi",
    propertySpotlight: "Reserva dos Corais Bungalows",
    periodLabel: "18 Nov – 22 Dez",
    discountPercent: 31,
    barPrice: 3290,
    memberPrice: 2270,
    image:
      "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=900&q=80",
    theme: "beach",
  },
  {
    cityId: "gramado-canela",
    stateCode: "RS",
    destinationName: "Gramado & Vale dos Vinhedos",
    propertySpotlight: "Château des Vignes & Spa",
    periodLabel: "20 Nov – 28 Dez",
    discountPercent: 27,
    barPrice: 2290,
    memberPrice: 1670,
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80",
    theme: "mountain",
  },
  {
    cityId: "trancoso-praia-do-forte",
    stateCode: "BA",
    destinationName: "Trancoso & Praia do Forte",
    propertySpotlight: "Vila Nativos Quadrado",
    periodLabel: "15 Nov – 19 Dez",
    discountPercent: 26,
    barPrice: 3580,
    memberPrice: 2649,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    theme: "villa",
  },
  {
    cityId: "porto-de-galinhas",
    stateCode: "PE",
    destinationName: "Porto de Galinhas & Carneiros",
    propertySpotlight: "Kembali Muro Alto Bangalôs",
    periodLabel: "22 Nov – 20 Dez",
    discountPercent: 25,
    barPrice: 2990,
    memberPrice: 2240,
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
    theme: "beach",
  },
  {
    cityId: "campos-monte-verde",
    stateCode: "SP/MG",
    destinationName: "Campos do Jordão & Monte Verde",
    propertySpotlight: "Hotel Botanique Mantiqueira",
    periodLabel: "13 Nov – 15 Dez",
    discountPercent: 24,
    barPrice: 2890,
    memberPrice: 2196,
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
    theme: "mountain",
  },
  {
    cityId: "caldas-rio-quente-pirenopolis",
    stateCode: "GO",
    destinationName: "Rio Quente & Pirenópolis",
    propertySpotlight: "Reserva das Águas Thermal",
    periodLabel: "16 Nov – 21 Dez",
    discountPercent: 29,
    barPrice: 2150,
    memberPrice: 1526,
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
    theme: "thermal",
  },
  {
    cityId: "balneario-florianopolis-penha",
    stateCode: "SC",
    destinationName: "Jurerê & Balneário Camboriú",
    propertySpotlight: "L'Hôtel Jurerê & Marina",
    periodLabel: "25 Nov – 23 Dez",
    discountPercent: 25,
    barPrice: 2390,
    memberPrice: 1790,
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
    theme: "beach",
  },
  {
    cityId: "fortaleza-jeri-natal-pipa",
    stateCode: "CE/RN",
    destinationName: "Jericoacoara & Praia da Pipa",
    propertySpotlight: "Alchymist & Falésias Sanctuary",
    periodLabel: "19 Nov – 17 Dez",
    discountPercent: 23,
    barPrice: 2650,
    memberPrice: 2040,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80",
    theme: "beach",
  },
  {
    cityId: "olimpia-litoral-sp",
    stateCode: "SP",
    destinationName: "Ilhabela & Olímpia Thermas",
    propertySpotlight: "DPNY Ilhabela & Thermas VIP",
    periodLabel: "14 Nov – 20 Dez",
    discountPercent: 24,
    barPrice: 1990,
    memberPrice: 1512,
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=80",
    theme: "thermal",
  },
];

interface DestinationFolderCarouselProps {
  selectedCityId: string;
  activeScreen: string;
  onSelectDestination: (cityId: string) => void;
}

export function DestinationFolderCarousel({
  selectedCityId,
  activeScreen,
  onSelectDestination,
}: DestinationFolderCarouselProps) {
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => {
        const next = (prev + 1) % FICTIONAL_DESTINATION_FOLDERS.length;
        if (scrollContainerRef.current) {
          const cardWidth = 310;
          const maxScroll =
            scrollContainerRef.current.scrollWidth -
            scrollContainerRef.current.clientWidth;
          const targetScroll = next * cardWidth;
          scrollContainerRef.current.scrollTo({
            left: targetScroll > maxScroll ? 0 : targetScroll,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, 3600);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleManualStep = (direction: "prev" | "next") => {
    setIsAutoPlaying(false);
    setFeaturedIndex((prev) => {
      const next =
        direction === "next"
          ? (prev + 1) % FICTIONAL_DESTINATION_FOLDERS.length
          : prev === 0
          ? FICTIONAL_DESTINATION_FOLDERS.length - 1
          : prev - 1;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: next * 310,
          behavior: "smooth",
        });
      }
      return next;
    });
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  return (
    <section
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      className="bg-[#F3EDE2] text-[#182026] border-b border-[#E2D9C8] py-4 px-4 sm:px-6 md:px-8 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho Solar & Elegante do Folder */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium">
              Temporadas & Lotes Exclusivos
            </span>
            <span className="hidden sm:inline text-[#182026]/25">•</span>
            <span className="hidden sm:inline text-xs text-[#5C646B] font-normal">
              Toque em qualquer destino para explorar as tarifas do período
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="p-1.5 rounded-full bg-white/80 border border-[#E2D9C8] text-[#5C646B] hover:text-[#B8863B] hover:border-[#B8863B] transition cursor-pointer"
              title={isAutoPlaying ? "Pausar" : "Reproduzir"}
            >
              {isAutoPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => handleManualStep("prev")}
              className="p-1.5 rounded-full bg-white/80 border border-[#E2D9C8] text-[#5C646B] hover:text-[#182026] hover:border-[#B8863B] transition cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleManualStep("next")}
              className="p-1.5 rounded-full bg-white/80 border border-[#E2D9C8] text-[#5C646B] hover:text-[#182026] hover:border-[#B8863B] transition cursor-pointer"
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trilha de Cards Claros, Iluminados e Chamativos */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-1"
        >
          {FICTIONAL_DESTINATION_FOLDERS.map((item, idx) => {
            const isSelected =
              (activeScreen === "destination" && selectedCityId === item.cityId) ||
              featuredIndex === idx;

            return (
              <div
                key={item.cityId}
                onClick={() => {
                  setFeaturedIndex(idx);
                  onSelectDestination(item.cityId);
                }}
                className={`group shrink-0 w-[268px] sm:w-[298px] rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer bg-white ${
                  isSelected
                    ? "border-[#B8863B] shadow-md ring-1 ring-[#B8863B]/25"
                    : "border-[#E4DDD0] hover:border-[#B8863B]/60 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Imagem Panorâmica Viva e Iluminada */}
                <div className="relative h-32 w-full overflow-hidden">
                  <LuxuryImage
                    src={item.image}
                    alt={item.destinationName}
                    fallbackLabel={item.destinationName}
                    theme={item.theme}
                    className="w-full h-full group-hover:scale-105 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                  {/* Topo: Período em pílula clara + Desconto em Terracota Vibrante */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/92 backdrop-blur-md text-[#182026] text-[10px] tracking-wide font-medium shadow-sm">
                      {item.periodLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#B83B2B] text-white text-[10px] tracking-wider font-medium shadow-sm">
                      -{item.discountPercent}% OFF
                    </span>
                  </div>

                  {/* Base da Imagem: Estado + Nome do Destino */}
                  <div className="absolute bottom-2 left-3 right-3 z-20">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#FFE599] font-medium block drop-shadow">
                      {item.stateCode}
                    </span>
                    <h3 className="font-editorial text-xl text-white font-normal leading-snug truncate drop-shadow">
                      {item.destinationName}
                    </h3>
                  </div>
                </div>

                {/* Rodapé Claro em Fundo Branco Puro */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white border-t border-[#F0EAE0]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-[#5C646B]/70 line-through tabular-price">
                      {formatBRL(item.barPrice)}
                    </span>
                    <span className="text-sm font-semibold text-[#0F5257] tabular-price">
                      {formatBRL(item.memberPrice)}
                    </span>
                    <span className="text-[10px] text-[#5C646B]">/noite</span>
                  </div>

                  <span className="text-[11px] text-[#9A6D28] group-hover:translate-x-0.5 transition inline-flex items-center gap-0.5 font-medium">
                    <span>Ver tarifas</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
