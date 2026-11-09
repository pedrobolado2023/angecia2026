"use client";

import React, { useState, useMemo } from "react";
import { calculateVellutoPricing } from "@/lib/pricingEngine";
import {
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface PricingSimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialNetRate?: number;
  initialBarRate?: number;
}

export function PricingSimulatorDrawer({
  isOpen,
  onClose,
  initialNetRate = 1630,
  initialBarRate = 2400,
}: PricingSimulatorDrawerProps) {
  const [netRate, setNetRate] = useState<number>(initialNetRate);
  const [barRate, setBarRate] = useState<number>(initialBarRate);
  const [markupPercent, setMarkupPercent] = useState<number>(15);
  const [testNegativeGuardrail, setTestNegativeGuardrail] = useState(false);

  const calculation = useMemo(() => {
    try {
      const targetNet = testNegativeGuardrail ? 0 : netRate;
      return {
        data: calculateVellutoPricing(targetNet, barRate, markupPercent / 100),
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Erro de validação",
      };
    }
  }, [netRate, barRate, markupPercent, testNegativeGuardrail]);

  if (!isOpen) return null;

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#182026]/45 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#FAF7F2] text-[#182026] h-full overflow-y-auto border-l border-[#E2D9C8] p-5 sm:p-8 shadow-2xl">
        {/* Header Claro */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] pb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
              Agente 02 • Engenharia Comercial (Net + 15%)
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#182026] font-normal">
              Simulador de Precificação & Proteção de Margem
            </h2>
            <p className="text-xs text-[#5C646B] mt-1">
              Auditoria em tempo real: Tarifa Net, Markup Líquido de 15%, PIX (0,80%) e parcelamento em até 12x.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white border border-[#E2D9C8] text-[#5C646B] hover:text-[#182026] transition shrink-0 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 bg-white p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1.5">
              Tarifa Net (R$)
            </label>
            <input
              type="number"
              value={netRate}
              onChange={(e) => {
                setTestNegativeGuardrail(false);
                setNetRate(Number(e.target.value));
              }}
              className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-xl px-3.5 py-2 text-sm text-[#182026] tabular-price focus:outline-none focus:border-[#B8863B]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1.5">
              Tarifa Oficial BAR (R$)
            </label>
            <input
              type="number"
              value={barRate}
              onChange={(e) => setBarRate(Number(e.target.value))}
              className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-xl px-3.5 py-2 text-sm text-[#182026] tabular-price focus:outline-none focus:border-[#B8863B]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium mb-1.5">
              Meta Líquida (%)
            </label>
            <input
              type="number"
              min={15}
              max={45}
              value={markupPercent}
              onChange={(e) => setMarkupPercent(Number(e.target.value))}
              className="w-full bg-[#FAF7F2] border border-[#E2D9C8] rounded-xl px-3.5 py-2 text-sm text-[#182026] tabular-price focus:outline-none focus:border-[#B8863B]"
            />
          </div>
        </div>

        {/* Teste Guardrail */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 px-4 py-3 rounded-xl bg-white border border-[#E5DEC9]">
          <div className="flex items-center gap-2.5 text-xs text-[#465058]">
            <Lock className="w-4 h-4 text-[#B83B2B] shrink-0" />
            <span>Trava contra erro de tarifa XML (Tarifa Zero ou abaixo do Net).</span>
          </div>
          <button
            onClick={() => setTestNegativeGuardrail(!testNegativeGuardrail)}
            className="px-3.5 py-1.5 rounded-lg text-xs bg-[#B83B2B] text-white transition cursor-pointer shrink-0"
          >
            {testNegativeGuardrail ? "Restaurar Tarifa" : "Testar Tarifa Zero"}
          </button>
        </div>

        {calculation.error && (
          <div className="p-4 rounded-xl bg-[#B83B2B]/10 border border-[#B83B2B] text-[#182026] mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B83B2B] shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{calculation.error}</p>
          </div>
        )}

        {calculation.data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 tabular-price">
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9]">
                <span className="text-[10px] text-[#5C646B] uppercase tracking-[0.16em]">
                  Tarifa Oficial (BAR)
                </span>
                <p className="text-xl text-[#B83B2B] line-through mt-1">
                  {formatBRL(calculation.data.barRate)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#B8863B]">
                <span className="text-[10px] text-[#9A6D28] font-medium uppercase tracking-[0.16em]">
                  Tarifa Membro PIX
                </span>
                <p className="text-2xl font-semibold text-[#182026] mt-1">
                  {formatBRL(calculation.data.pix.pixPrice)}
                </p>
                <span className="text-[11px] text-[#9A6D28] mt-0.5 block">
                  Economia de {formatBRL(calculation.data.pix.savingsVsBar)} (-
                  {calculation.data.pix.savingsVsBarPercent}%)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0F5257]/8 border border-[#0F5257]/30">
                <span className="text-[10px] text-[#0F5257] font-medium uppercase tracking-[0.16em]">
                  Lucro Líquido Hóspede Club
                </span>
                <p className="text-2xl font-semibold text-[#0F5257] mt-1">
                  {formatBRL(calculation.data.pix.netProfitAmount)}
                </p>
                <span className="text-[11px] text-[#0F5257] mt-0.5 block">
                  Margem Líquida: {calculation.data.pix.netMarginOnNetPercent}%
                </span>
              </div>
            </div>

            {/* Tabela 1x a 12x */}
            <div className="bg-white rounded-2xl border border-[#E5DEC9] overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 border-b border-[#EAE3D5] bg-[#F3EDE2]/60 flex items-center justify-between">
                <span className="text-xs text-[#182026] font-medium">
                  Parcelamento Inteligente (1x a 12x) • Repasse de Antecipação
                </span>
                <span className="text-[11px] text-[#0F5257] font-medium">
                  Margem 15% Protegida
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px] tabular-price">
                  <thead className="bg-[#FAF7F2] text-[#9A6D28] text-[10px] uppercase tracking-wider border-b border-[#EAE3D5]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Parcela</th>
                      <th className="py-2.5 px-4 font-medium">Valor Parcela</th>
                      <th className="py-2.5 px-4 font-medium">Total Cobrado</th>
                      <th className="py-2.5 px-4 font-medium">Taxa Gateway</th>
                      <th className="py-2.5 px-4 font-medium">Lucro Líquido</th>
                      <th className="py-2.5 px-4 font-medium">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE0]">
                    {calculation.data.creditCard.installments.map((inst) => (
                      <tr key={inst.installments} className="hover:bg-[#FAF7F2]">
                        <td className="py-2 px-4 text-[#182026] font-medium">
                          {inst.installments}x
                        </td>
                        <td className="py-2 px-4 text-[#182026]">
                          {formatBRL(inst.installmentValue)}
                        </td>
                        <td className="py-2 px-4 text-[#5C646B]">
                          {formatBRL(inst.totalCharged)}
                        </td>
                        <td className="py-2 px-4 text-[#5C646B]">
                          {inst.gatewayFeePercent}%
                        </td>
                        <td className="py-2 px-4 text-[#0F5257] font-medium">
                          {formatBRL(inst.netProfitAmount)}
                        </td>
                        <td className="py-2 px-4 text-[#0F5257] font-medium">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {inst.netMarginOnNetPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
