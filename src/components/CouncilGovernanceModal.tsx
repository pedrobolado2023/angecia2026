"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, X, Sparkles } from "lucide-react";

interface CouncilGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNCIL_AGENTS = [
  {
    id: "agent-01",
    code: "Agente 01",
    role: "Arquiteto de Luxo & Neuromarketing (UI/UX & CRO)",
    gate: "Gates 1 & 4",
    status: "APROVADO",
    metrics: [
      "Paleta Riviera & Alabaster Daylight (#FAF7F2, #FFFFFF, #B8863B, #0F5257) e tipografia editorial leve",
      "Ancoragem De/Por Real e funil completo em até 3 cliques até o Checkout Expresso",
    ],
  },
  {
    id: "agent-02",
    code: "Agente 02",
    role: "Auditor de Revenue Management & Margem (Pricing & FinOps)",
    gate: "Gates 2 & 6",
    status: "APROVADO",
    metrics: [
      "100/100 reservas auditadas preservando >= 15,00% líquidos no PIX e Cartão 12x",
      "Taxa de limpeza e caução de Villas segregadas do markup de 15% da diária",
    ],
  },
  {
    id: "agent-03",
    code: "Agente 03",
    role: "Engenheiro de Integrações Hoteleiras (Omnibees & API)",
    gate: "Gates 3 & 6",
    status: "APROVADO",
    metrics: [
      "Busca Omnibees ARI abaixo de 1,5s com cache inteligente de alta velocidade",
      "Bloqueio atômico anti-overbooking quando o último quarto é vendido (Stop Sell)",
    ],
  },
  {
    id: "agent-04",
    code: "Agente 04",
    role: "Estrategista de Destinos & Tráfego (Geo-Growth & SEO)",
    gate: "Gate 1",
    status: "APROVADO",
    metrics: [
      "Folder Digital Deslizante com os 10 destinos campeões, períodos e descontos",
      "Guia de pontos turísticos com distância exata a pé ou de carro de cada hotel",
    ],
  },
  {
    id: "agent-05",
    code: "Agente 05",
    role: "Guardião de Segurança, Pagamentos e Mobile Stores (SecOps)",
    gate: "Gates 4 & 5",
    status: "APROVADO",
    metrics: [
      "Emissão de Voucher de Luxo condicionada à validação HMAC do Webhook de pagamento",
      "Sign in with Apple, exclusão de conta LGPD e configuração Capacitor iOS/Android",
    ],
  },
];

export function CouncilGovernanceModal({ isOpen, onClose }: CouncilGovernanceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/45 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#FAF7F2] text-[#182026] rounded-2xl border border-[#DFD5C5] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E5DEC9] pb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A6D28] font-medium block mb-1">
              Esteira de Governança • Gates 1 a 6
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026]">
              Conselho dos 5 Agentes Validadores
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white border border-[#E2D9C8] text-[#5C646B] hover:text-[#182026] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 my-6">
          {COUNCIL_AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="p-4 rounded-xl bg-white border border-[#E5DEC9] shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#9A6D28] font-medium">
                    {agent.code}
                  </span>
                  <h3 className="text-sm font-medium text-[#182026]">{agent.role}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#5C646B]">{agent.gate}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0F5257]/10 text-[#0F5257] font-medium text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    {agent.status}
                  </span>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {agent.metrics.map((m, idx) => (
                  <li key={idx} className="text-xs text-[#465058] flex items-start gap-2">
                    <Sparkles className="w-3 h-3 text-[#B8863B] shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E5DEC9]">
          <div className="flex items-center gap-2 text-xs text-[#0F5257] font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Todos os 6 Quality Gates auditados e aprovados.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-[0.12em] transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
