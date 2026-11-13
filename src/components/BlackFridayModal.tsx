"use client";

import React, { useEffect, useState } from "react";
import { X, Flame, MapPin, ArrowRight, Clock, ShieldCheck } from "lucide-react";

interface BlackFridayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (cityId: string, cityName: string) => void;
}

export function BlackFridayModal({
  isOpen,
  onClose,
  onSelectDestination,
}: BlackFridayModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(10);

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(10);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const deals = [
    {
      cityId: "rio",
      name: "Rio de Janeiro & Região dos Lagos",
      tag: "Até 25% OFF",
      highlight: "Frente Mar & Zona Sul",
      fromPrice: "R$ 380",
      image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80",
    },
    {
      cityId: "gramado",
      name: "Gramado & Serra Gaúcha",
      tag: "Até 22% OFF",
      highlight: "Charme & Alta Gastronomia",
      fromPrice: "R$ 290",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
    },
    {
      cityId: "maceio",
      name: "Maceió & Maragogi (AL)",
      tag: "Até 24% OFF",
      highlight: "Caribe Brasileiro & Resorts",
      fromPrice: "R$ 420",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Container Principal — 100% Responsivo no Mobile e Desktop */}
      <div 
        className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col bg-gradient-to-b from-[#182026] via-[#11171C] to-[#0A0D10] text-white rounded-2xl sm:rounded-3xl border border-[#B8863B]/40 shadow-2xl shadow-[#B8863B]/20 overflow-hidden animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra de Progresso do Timer de 10 segundos */}
        <div className="relative h-1 sm:h-1.5 w-full bg-white/10 overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#B8863B] via-[#E5C378] to-[#FFF3D1] transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>

        {/* Botão de Fechar no Topo Direito (Target Touch Amplo no Mobile) */}
        <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2">
          <span className="text-[9px] sm:text-[10px] text-[#A6B0BA] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#E5C378]" />
            <span>{timeLeft}s</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white transition cursor-pointer border border-white/15 touch-manipulation shadow-md"
            title="Fechar (ESC)"
            aria-label="Fechar Pop-up"
          >
            <X className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Corpo com Scroll Suave caso necessário em telas pequenas */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-3.5 sm:space-y-5 overscroll-contain">
          {/* Header Chamativo da Black Friday */}
          <div className="space-y-1.5 sm:space-y-2 pr-16 sm:pr-20">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#B8863B]/20 border border-[#B8863B]/40 text-[#E5C378] text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.16em]">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E5C378] animate-pulse" />
              <span>BLACK FRIDAY HÓSPEDE CLUB</span>
            </div>

            <h2 className="font-editorial text-xl sm:text-3xl text-white font-normal leading-tight">
              Destinos Selecionados com{" "}
              <span className="bg-gradient-to-r from-[#FFF0C8] via-[#E5C378] to-[#B8863B] bg-clip-text text-transparent font-semibold">
                até 25% de Desconto Real
              </span>
            </h2>

            <p className="text-[11px] sm:text-xs text-[#A6B0BA] leading-relaxed">
              Tarifas de membro negociadas diretamente com hotéis 5 estrelas e resorts. Sem taxas ocultas e com voucher garantido.
            </p>
          </div>

          {/* Grid Responsivo: Carrossel Horizontal Deslizável no Mobile & Grade 3 Colunas no Desktop */}
          <div className="flex sm:grid sm:grid-cols-3 gap-2.5 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-none -mx-1 px-1">
            {deals.map((item) => (
              <div
                key={item.cityId}
                onClick={() => {
                  onSelectDestination(item.cityId, item.name);
                  onClose();
                }}
                className="min-w-[210px] sm:min-w-0 flex-1 snap-center group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#B8863B] active:border-[#B8863B] bg-[#1A2228]/80 hover:bg-[#1A2228] transition cursor-pointer p-2.5 sm:p-3 flex flex-col justify-between space-y-2 shadow-sm touch-manipulation"
              >
                <div className="relative h-24 sm:h-28 rounded-xl overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#B8863B] text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {item.tag}
                  </div>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-white font-medium">
                    <MapPin className="w-3 h-3 text-[#E5C378] shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-[#A6B0BA] block truncate">
                    {item.highlight}
                  </span>
                  <div className="pt-1 flex items-baseline justify-between border-t border-white/5">
                    <span className="text-[9px] sm:text-[10px] text-[#A6B0BA]">A partir de</span>
                    <span className="text-xs sm:text-sm font-bold text-[#FFF0C8]">
                      {item.fromPrice}
                      <span className="text-[9px] font-normal text-[#A6B0BA]">/noite</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dica visual de arrastar no mobile */}
          <div className="flex sm:hidden items-center justify-center gap-1.5 text-[10px] text-[#A6B0BA]/70">
            <span>👈 Deslize para ver mais destinos</span>
          </div>

          {/* Rodapé com CTA Chamativo & Garantias */}
          <div className="pt-2.5 sm:pt-3 border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#A6B0BA] text-center sm:text-left">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E5C378] shrink-0" />
              <span>Disponibilidade confirmada em tempo real • Sem taxas ocultas</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none py-2.5 px-3 rounded-xl text-xs text-[#A6B0BA] hover:text-white hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-center touch-manipulation"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDestination("rio", "Rio de Janeiro & Região dos Lagos");
                  onClose();
                }}
                className="flex-2 sm:flex-none py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#C99846] to-[#B8863B] active:opacity-90 hover:opacity-95 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-[#B8863B]/25 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation whitespace-nowrap"
              >
                <span>Ver Ofertas Black Friday</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
