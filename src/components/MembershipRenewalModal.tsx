"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  QrCode,
  CreditCard,
  Building2,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

interface MembershipRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribedSuccess: () => void;
  onBrowseHotels: () => void;
  customerName?: string;
}

export function MembershipRenewalModal({
  isOpen,
  onClose,
  onSubscribedSuccess,
  onBrowseHotels,
  customerName = "Membro",
}: MembershipRenewalModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"PIX" | "CARD">("PIX");
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: selectedMethod }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        if (selectedMethod === "PIX" && data.payment?.pixCopyPaste) {
          setPixData({
            qrCode: data.payment.pixQrCode,
            copyPaste: data.payment.pixCopyPaste,
          });
        } else {
          setSuccessNotice(true);
          setTimeout(() => {
            onSubscribedSuccess();
            onClose();
          }, 1500);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmPixPayment = () => {
    setSuccessNotice(true);
    setTimeout(() => {
      onSubscribedSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-lg w-full bg-white text-[#182026] border border-[#DFD5C5] rounded-3xl shadow-2xl my-auto overflow-hidden animate-slide-up">
        {/* Topo Dourado de Alto Padrão */}
        <div className="bg-[#FAF7F2] border-b border-[#EAE3D5] p-5 sm:p-6 flex items-start justify-between relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8863B]/10 text-[#9A6D28] text-[10px] font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#B8863B]" />
              <span>Clube de Vantagens Exclusivo</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026]">
              Renovação do Membro VIP
            </h2>
            <p className="text-xs text-[#5C646B] mt-1">
              Olá, {customerName.split(" ")[0]}! Seu período de degustação de 7 dias encerrou.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#EAE3D5] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {successNotice ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-editorial text-2xl text-[#182026]">
                Assinatura Ativada com Sucesso!
              </h3>
              <p className="text-xs text-[#5C646B]">
                Suas tarifas secretas de membro com até 28% de economia foram reativadas por 30 dias.
              </p>
            </div>
          ) : pixData ? (
            /* Tela do PIX de R$ 19,90 */
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] inline-block mx-auto">
                <QrCode className="w-36 h-36 text-[#182026] mx-auto" />
              </div>

              <div>
                <span className="text-xs text-[#5C646B] block">Valor da Mensalidade</span>
                <span className="text-2xl font-semibold text-[#0F5257]">R$ 19,90/mês</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-mono text-[#5C646B] text-[11px] text-left">
                  {pixData.copyPaste}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 rounded-lg bg-[#0F5257] text-white hover:bg-[#146B72] transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmPixPayment}
                className="w-full py-3.5 rounded-2xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Já fiz o pagamento via PIX</span>
              </button>
            </div>
          ) : (
            <>
              {/* Duas Opções de Renovação */}
              <div className="space-y-3">
                {/* Opção 1: Assinatura Mensal R$ 19,90 */}
                <div className="p-4 rounded-2xl border-2 border-[#B8863B] bg-[#FAF7F2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#9A6D28] font-bold block">
                        Opção Recomendada
                      </span>
                      <h4 className="font-editorial text-lg text-[#182026]">
                        Plano Hóspede VIP Mensal
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#0F5257]">R$ 19,90</span>
                      <span className="text-[10px] text-[#5C646B] block">/mês</span>
                    </div>
                  </div>

                  <ul className="text-xs text-[#465058] space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5257] shrink-0" />
                      <span>Tarifas com até 28% de economia em centenas de resorts e hotéis</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5257] shrink-0" />
                      <span>Acesso prioritário a tarifas exclusivas e hotéis 5 estrelas</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5257] shrink-0" />
                      <span>Cancele quando quiser, sem fidelidade ou carência</span>
                    </li>
                  </ul>

                  {/* Seletor de Pagamento */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("PIX")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        selectedMethod === "PIX"
                          ? "bg-[#0F5257] text-white border-[#0F5257]"
                          : "bg-white text-[#5C646B] border-[#E2D9C8] hover:border-[#B8863B]"
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>PIX Imediato</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod("CARD")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        selectedMethod === "CARD"
                          ? "bg-[#0F5257] text-white border-[#0F5257]"
                          : "bg-white text-[#5C646B] border-[#E2D9C8] hover:border-[#B8863B]"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cartão de Crédito</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Gerando Pagamento...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Assinar por R$ 19,90/mês</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Opção 2: Reativação por Reserva */}
                <div className="p-4 rounded-2xl border border-[#E5DEC9] bg-white flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#9A6D28]" />
                      <h4 className="text-xs font-semibold text-[#182026]">
                        Reativar com Nova Reserva
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#5C646B] mt-0.5">
                      Ao reservar qualquer hotel ou resort, seu membro é reativado gratuitamente por +45 dias.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBrowseHotels();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#DFD5C5] text-[#182026] hover:border-[#B8863B] text-xs font-medium transition cursor-pointer shrink-0"
                  >
                    Ver Hotéis
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

