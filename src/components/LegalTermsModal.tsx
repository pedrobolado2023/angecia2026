"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, FileText, RotateCcw, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export type LegalModalTab = "termos" | "privacidade" | "cancelamento";

interface LegalTermsModalProps {
  isOpen: boolean;
  initialTab?: LegalModalTab;
  onClose: () => void;
  hotelName?: string;
  cancellationText?: string;
}

export function LegalTermsModal({
  isOpen,
  initialTab = "termos",
  onClose,
  hotelName,
  cancellationText,
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] border border-[#E5DEC9] rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Topo do Modal */}
        <div className="px-5 py-4 border-b border-[#EAE3D5] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#B8863B]" />
            <span className="font-editorial text-lg text-[#182026]">
              Transparência & Conformidade Legal
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#FAF7F2] transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-[#EAE3D5] bg-[#F4EFE6] px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("termos")}
            className={`px-3 py-2 rounded-t-xl font-medium flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === "termos"
                ? "bg-white text-[#182026] border-[#EAE3D5] font-semibold -mb-px"
                : "border-transparent text-[#5C646B] hover:text-[#182026]"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>Termos e Condições</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cancelamento")}
            className={`px-3 py-2 rounded-t-xl font-medium flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === "cancelamento"
                ? "bg-white text-[#182026] border-[#EAE3D5] font-semibold -mb-px"
                : "border-transparent text-[#5C646B] hover:text-[#182026]"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#B8863B]" />
            <span>Políticas de Cancelamento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacidade")}
            className={`px-3 py-2 rounded-t-xl font-medium flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === "privacidade"
                ? "bg-white text-[#182026] border-[#EAE3D5] font-semibold -mb-px"
                : "border-transparent text-[#5C646B] hover:text-[#182026]"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#0F5257]" />
            <span>Proteção de Dados (LGPD)</span>
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#465058] leading-relaxed bg-white">
          {activeTab === "termos" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8]">
                <strong className="text-xs text-[#0F5257] block mb-0.5">
                  ✓ Transparência de Preço Final:
                </strong>
                <p className="text-[11px] text-[#5C646B]">
                  Todas as taxas governamentais, impostos (ISS), taxas de serviço do hotel e regime de alimentação já estão inclusos no valor apresentado. Não há cobranças de taxas surpresa no check-out.
                </p>
              </div>

              <h4 className="font-semibold text-sm text-[#182026]">1. Contratação e Emissão do Voucher</h4>
              <p>
                O Hóspede Club é um clube privado que intermedia reservas com tarifas exclusivas de membro. A confirmação da reserva é imediata após a liquidação do pagamento via PIX ou Cartão pelo Mercado Pago. O voucher gerado com localizador alfanumérico único garante sua acomodação no hotel.
              </p>

              <h4 className="font-semibold text-sm text-[#182026]">2. Documentos Exigidos no Check-in</h4>
              <p>
                Conforme exigência do Ministério do Turismo e regulamentação interna dos hotéis, o titular e acompanhantes devem apresentar documento oficial com foto (RG, CNH ou Passaporte) e CPF no balcão de recepção na chegada.
              </p>

              <h4 className="font-semibold text-sm text-[#182026]">3. Horários e Regras Gerais</h4>
              <p>
                O check-in padrão inicia a partir das 14h00/15h00 e o check-out encerra às 11h00/12h00. Pedidos de early check-in ou late check-out estão sujeitos a disponibilidade e cobrança direta pelo hotel.
              </p>
            </div>
          )}

          {activeTab === "cancelamento" && (
            <div className="space-y-4">
              {cancellationText ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <strong className="block text-xs uppercase tracking-wider mb-1">
                    Condição desta Acomodação {hotelName ? `(${hotelName})` : ""}:
                  </strong>
                  <p className="text-xs font-medium">{cancellationText}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0F5257]/5 border border-[#0F5257]/20">
                  <span className="font-semibold text-xs text-[#0F5257] block mb-1">
                    Tarifa Reembolsável:
                  </span>
                  <p className="text-[11px] text-[#5C646B]">
                    Permite cancelamento gratuito com estorno integral de 100% no mesmo meio de pagamento, se solicitado dentro do prazo limite informado no voucher.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#B83B2B]/5 border border-[#B83B2B]/20">
                  <span className="font-semibold text-xs text-[#B83B2B] block mb-1">
                    Tarifa Não Reembolsável (NRF):
                  </span>
                  <p className="text-[11px] text-[#5C646B]">
                    Tarifa promocional com tarifa negociada agressiva. Não permite estorno financeiro em caso de cancelamento voluntário ou no-show.
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-sm text-[#182026]">Prazos de Estorno</h4>
              <p>
                Para cancelamentos elegíveis: no PIX o estorno é processado em 24 a 48h úteis; no Cartão de Crédito é efetuado imediatamente junto ao Mercado Pago (o crédito ocorre na fatura atual ou seguinte).
              </p>
            </div>
          )}

          {activeTab === "privacidade" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#0F5257]/5 border border-[#0F5257]/20 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0F5257] shrink-0 mt-0.5" />
                <p className="text-xs text-[#0F5257] leading-relaxed">
                  Seus dados são protegidos por criptografia SSL de 256 bits e tratados estritamente para a efetivação da sua reserva, emissão do voucher e cumprimento das exigências da Embratur.
                </p>
              </div>

              <h4 className="font-semibold text-sm text-[#182026]">1. Dados Coletados</h4>
              <p>
                Nome completo, CPF, e-mail, WhatsApp e endereço de faturamento. Não comercializamos dados de clientes com terceiros.
              </p>

              <h4 className="font-semibold text-sm text-[#182026]">2. Direitos do Titular (Art. 18 da LGPD)</h4>
              <p>
                Você pode solicitar consulta, correção ou exclusão imediata do seu cadastro a qualquer momento pelo botão de autoatendimento no perfil de membro ou pelo e-mail privacidade@hospedeclub.com.br.
              </p>

              <h4 className="font-semibold text-sm text-[#182026]">3. Pagamentos Seguros</h4>
              <p>
                O processamento bancário é realizado pelo Mercado Pago de forma tokenizada. Dados confidenciais de cartão não passam nem ficam armazenados em nossos servidores.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3.5 border-t border-[#EAE3D5] bg-[#FAF7F2] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Link
              href={activeTab === "termos" ? "/termos" : activeTab === "cancelamento" ? "/cancelamento" : "/privacidade"}
              target="_blank"
              className="text-[#9A6D28] underline font-medium hover:text-[#182026]"
            >
              Abrir página completa em nova guia
            </Link>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium transition cursor-pointer shadow-xs"
          >
            Entendido &bull; Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
