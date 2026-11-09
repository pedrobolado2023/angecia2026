"use client";

import React, { useState } from "react";
import { CuratedHotel } from "@/data/vellutoCatalog";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import {
  X,
  Save,
  CheckCircle2,
  AlertOctagon,
  Sliders,
} from "lucide-react";

interface ExtranetModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: CuratedHotel[];
  onUpdateHotel: (
    hotelId: string,
    updates: {
      netRate: number;
      barRate: number;
      omnibeesAvailableRooms: number;
      stopSell: boolean;
    }
  ) => void;
}

export function ExtranetModal({
  isOpen,
  onClose,
  hotels,
  onUpdateHotel,
}: ExtranetModalProps) {
  const [selectedId, setSelectedId] = useState<string>(hotels[0]?.id || "");
  const currentHotel = hotels.find((h) => h.id === selectedId) || hotels[0];

  const [netRate, setNetRate] = useState<number>(currentHotel?.netRate || 1630);
  const [barRate, setBarRate] = useState<number>(currentHotel?.barRate || 2400);
  const [allotment, setAllotment] = useState<number>(
    currentHotel?.omnibeesAvailableRooms ?? 2
  );
  const [stopSell, setStopSell] = useState<boolean>(Boolean(currentHotel?.stopSell));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen || !currentHotel) return null;

  const handleSelectChange = (id: string) => {
    setSelectedId(id);
    const found = hotels.find((h) => h.id === id);
    if (found) {
      setNetRate(found.netRate);
      setBarRate(found.barRate);
      setAllotment(found.omnibeesAvailableRooms);
      setStopSell(Boolean(found.stopSell));
      setSavedNotice(null);
    }
  };

  const handleSave = () => {
    if (netRate <= 50) {
      setSavedNotice("ERRO: Guardrail Agente 02 bloqueou Tarifa Net <= R$ 50.");
      return;
    }
    onUpdateHotel(currentHotel.id, {
      netRate,
      barRate,
      omnibeesAvailableRooms: stopSell ? 0 : Math.max(0, allotment),
      stopSell,
    });
    setSavedNotice("Tarifário Direto & Lote ARI atualizados em tempo real no catálogo!");
    setTimeout(() => setSavedNotice(null), 4000);
  };

  let previewPricing = null;
  try {
    previewPricing = calculateVellutoPricing(netRate, barRate, 0.15);
  } catch {
    previewPricing = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/45 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#FAF7F2] text-[#182026] rounded-2xl border border-[#DFD5C5] p-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#E5DEC9] pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#DFD5C5] text-[#9A6D28] text-[11px] font-medium uppercase tracking-wider mb-2">
              <Sliders className="w-3.5 h-3.5 text-[#B8863B]" />
              Módulo 2 • Extranet Direta & ARI Omnibees
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026]">
              Gestão de Tarifário Net, Allotment & Stop Sell
            </h2>
            <p className="text-xs sm:text-sm text-[#5C646B] mt-1">
              Altere a Tarifa Net negociada ou o estoque de quartos para testar o gatilho de escassez (&le; 3 suítes) e o bloqueio anti-overbooking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white border border-[#E2D9C8] text-[#5C646B] hover:text-[#182026] transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-5">
          {/* Seleção do Hotel/Villa */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9A6D28] font-medium mb-1.5">
              Selecionar Propriedade Parceira
            </label>
            <select
              value={selectedId}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm text-[#182026] font-medium focus:outline-none focus:border-[#B8863B]"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id} className="bg-white">
                  [{h.stateCode}] {h.name} — ({h.omnibeesChannelCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9]">
              <label className="block text-xs uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                Tarifa Net Acordada (R$)
              </label>
              <input
                type="number"
                value={netRate}
                onChange={(e) => setNetRate(Number(e.target.value))}
                className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-lg px-3 py-2 text-base font-medium text-[#182026]"
              />
              <span className="text-[11px] text-[#5C646B] mt-1 block">
                Valor líquido entregue pelo hotel
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9]">
              <label className="block text-xs uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                Tarifa Pública BAR (R$)
              </label>
              <input
                type="number"
                value={barRate}
                onChange={(e) => setBarRate(Number(e.target.value))}
                className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-lg px-3 py-2 text-base font-medium text-[#182026]"
              />
              <span className="text-[11px] text-[#5C646B] mt-1 block">
                Tarifa balcão para ancoragem De/Por
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9]">
              <label className="block text-xs uppercase tracking-wider text-[#9A6D28] font-medium mb-1">
                Allotment Disponível (Quartos)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={allotment}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAllotment(val);
                  if (val === 0) setStopSell(true);
                  else setStopSell(false);
                }}
                className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-lg px-3 py-2 text-base font-medium text-[#182026]"
              />
              <span className="text-[11px] text-[#5C646B] mt-1 block">
                &le; 3 aciona Escassez | 0 = Stop Sell
              </span>
            </div>
          </div>

          {/* Toggle Stop Sell / Anti-Overbooking */}
          <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-5 h-5 text-[#B83B2B] shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-[#182026] font-medium block">
                  Simulador de Fechamento de Vendas (Stop Sell / Último Quarto Vendido — Gate 3)
                </strong>
                <span className="text-[#5C646B]">
                  Quando ativado (ou quando o último quarto é reservado), o sistema bloqueia a venda instantaneamente evitando overbooking.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !stopSell;
                setStopSell(next);
                if (next) setAllotment(0);
                else if (allotment === 0) setAllotment(2);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider shrink-0 transition cursor-pointer ${stopSell
                  ? "bg-[#B83B2B] text-white"
                  : "bg-[#F3EDE2] text-[#182026] hover:bg-[#EAE3D5]"
                }`}
            >
              {stopSell ? "Stop Sell ATIVO (0 Quartos)" : "Simular Stop Sell (0 Quartos)"}
            </button>
          </div>

          {/* Preview de Cálculo Automático */}
          {previewPricing && (
            <div className="p-4 rounded-xl bg-[#0F5257]/8 border border-[#0F5257]/25 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#5C646B] block">Preço Membro PIX Calculado:</span>
                <strong className="text-lg text-[#182026] font-semibold">
                  R$ {previewPricing.pix.pixPrice.toLocaleString("pt-BR")}
                </strong>
              </div>
              <div>
                <span className="text-[#5C646B] block">Economia Exibida ao Cliente:</span>
                <strong className="text-lg text-[#0F5257] font-semibold">
                  R$ {previewPricing.pix.savingsVsBar.toLocaleString("pt-BR")} (-
                  {previewPricing.pix.savingsVsBarPercent}%)
                </strong>
              </div>
              <div>
                <span className="text-[#5C646B] block">Lucro Líquido Velluto (15%):</span>
                <strong className="text-lg text-[#0F5257] font-semibold">
                  R$ {previewPricing.pix.netProfitAmount.toLocaleString("pt-BR")} (
                  {previewPricing.pix.netMarginOnNetPercent}%)
                </strong>
              </div>
            </div>
          )}

          {savedNotice && (
            <div className="p-3.5 rounded-xl bg-[#0F5257]/10 border border-[#0F5257]/30 text-[#0F5257] text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#E5DEC9]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E2D9C8] text-xs font-medium text-[#5C646B] hover:text-[#182026] cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar e Atualizar Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
