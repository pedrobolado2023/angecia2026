"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, Flame, MapPin, ArrowRight, Clock, ShieldCheck, Tag } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Container Principal */}
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#182026] via-[#11171C] to-[#0A0D10] text-white rounded-3xl border border-[#B8863B]/40 shadow-2xl shadow-[#B8863B]/15 overflow-hidden animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra de Progresso do Timer de 10 segundos */}
        <div className="relative h-1 w-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#B8863B] via-[#E5C378] to-[#FFF3D1] transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>

        {/* Botão de Fechar no Topo Direito */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
          <span className="text-[10px] text-[#A6B0BA] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#E5C378]" />
            <span>Fecha em {timeLeft}s</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10"
            title="Fechar (ESC)"
            aria-label="Fechar Pop-up"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {/* Header Chamativo da Black Friday */}
          <div className="space-y-2 pr-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8863B]/20 border border-[#B8863B]/40 text-[#E5C378] text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]">
              <Flame className="w-3.5 h-3.5 text-[#E5C378] animate-pulse" />
              <span>BLACK FRIDAY HÓSPEDE CLUB</span>
            </div>

            <h2 className="font-editorial text-2xl sm:text-3xl text-white font-normal leading-tight">
              Destinos Selecionados com{" "}
              <span className="bg-gradient-to-r from-[#FFF0C8] via-[#E5C378] to-[#B8863B] bg-clip-text text-transparent font-semibold">
                até 25% de Desconto Real
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-[#A6B0BA] leading-relaxed">
              Tarifas exclusivas negociadas diretamente com a rede hoteleira parceira. Vagas limitadas para o período de alta temporada e fins de semana especiais.
            </p>
          </div>

          {/* Grid com os 3 Melhores Destinos e Preços */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {deals.map((item) => (
              <div
                key={item.cityId}
                onClick={() => {
                  onSelectDestination(item.cityId, item.name);
                  onClose();
                }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#B8863B] bg-[#1A2228]/60 hover:bg-[#1A2228] transition cursor-pointer p-3 flex flex-col justify-between space-y-3"
              >
                <div className="relative h-28 rounded-xl overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#B8863B] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {item.tag}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-[#A6B0BA]">
                    <MapPin className="w-3 h-3 text-[#E5C378] shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-[#A6B0BA]/80 block">
                    {item.highlight}
                  </span>
                  <div className="pt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-[#A6B0BA]">A partir de</span>
                    <span className="text-sm font-bold text-[#FFF0C8]">
                      {item.fromPrice}
                      <span className="text-[10px] font-normal text-[#A6B0BA]">/noite</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé com CTA Chamativo & Garantias */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[#A6B0BA]">
              <ShieldCheck className="w-4 h-4 text-[#E5C378] shrink-0" />
              <span>Disponibilidade confirmada em tempo real • Sem taxas ocultas</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs text-[#A6B0BA] hover:text-white hover:bg-white/5 transition cursor-pointer text-center"
              >
                Continuar Navegando
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDestination("rio", "Rio de Janeiro & Região dos Lagos");
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#C99846] to-[#B8863B] hover:opacity-95 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-[#B8863B]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Aproveitar Black Friday</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
