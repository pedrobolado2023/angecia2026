"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, ArrowLeft, ShieldCheck, RefreshCw, KeyRound, AlertCircle } from "lucide-react";
import { CURATED_HOTELS, CuratedHotel } from "@/data/vellutoCatalog";
import { AdminOmnibeesPanel } from "@/components/AdminOmnibeesPanel";
import { ExtranetModal } from "@/components/ExtranetModal";
import { CouncilGovernanceModal } from "@/components/CouncilGovernanceModal";
import { PricingSimulatorDrawer } from "@/components/PricingSimulatorDrawer";

export default function PrivadoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [hotelsCatalog, setHotelsCatalog] = useState<CuratedHotel[]>(CURATED_HOTELS);
  const [isExtranetModalOpen, setIsExtranetModalOpen] = useState<boolean>(false);
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState<boolean>(false);
  const [isPricingDrawerOpen, setIsPricingDrawerOpen] = useState<boolean>(false);

  // Verifica se já tem sessão de admin ativa
  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const res = await fetch("/api/admin/auth");
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    checkAdminAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!passcode.trim()) {
      setLoginError("Digite a senha de gestor.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || "Chave de acesso incorreta.");
      }
    } catch {
      setLoginError("Erro ao comunicar com o servidor de autenticação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHotel = (
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
      prev.map((h) => (h.id === hotelId ? { ...h, ...updates } : h))
    );
  };

  const handleAddHotel = (hotel: CuratedHotel) => {
    setHotelsCatalog((prev) => [hotel, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-xs text-[#9A6D28]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Verificando credenciais de acesso seguro...</span>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN PRIVADO
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F3EDE2] text-[#182026] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#DFD5C5] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#9A6D28] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Site</span>
            </Link>
            <span className="px-2.5 py-1 rounded-full bg-[#B8863B]/10 text-[#9A6D28] text-[10px] uppercase font-semibold">
              Ambiente Restrito
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#0F5257]/10 text-[#0F5257] border border-[#0F5257]/20 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026]">
              Portal Gestor • Hóspede Club
            </h1>
            <p className="text-xs text-[#5C646B]">
              Acesso exclusivo da governança, CRM de clientes e parametrização de canais.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-[#B83B2B]/10 border border-[#B83B2B]/30 text-xs text-[#B83B2B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                Chave Secreta de Gestor
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  className="w-full pl-9 pr-3.5 py-3 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Acessar Painel Gestor</span>
            </button>
          </form>

          <p className="text-[10px] text-center text-[#5C646B]/70">
            Acesso auditado por IP e protegido por sessão segura criptografada.
          </p>
        </div>
      </div>
    );
  }

  // TELA DO PAINEL GESTOR AUTENTICADO
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="bg-[#182026] text-white px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#E5DEC9] hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sair e Ir para o Site</span>
          </Link>
          <span className="text-white/20">•</span>
          <span className="text-xs font-medium text-[#B8863B]">
            Área Administrativa Privada (/privado)
          </span>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs text-white/70 hover:text-white cursor-pointer"
        >
          Encerrar Sessão
        </button>
      </div>

      <AdminOmnibeesPanel
        hotels={hotelsCatalog}
        onUpdateHotel={handleUpdateHotel}
        onAddHotel={handleAddHotel}
        onOpenHotelPreview={() => {}}
        onOpenExtranetModal={() => setIsExtranetModalOpen(true)}
        onOpenPricingSimulator={() => setIsPricingDrawerOpen(true)}
        onOpenGovernanceModal={() => setIsCouncilModalOpen(true)}
        onExitAdmin={() => setIsAuthenticated(false)}
      />

      <PricingSimulatorDrawer
        isOpen={isPricingDrawerOpen}
        onClose={() => setIsPricingDrawerOpen(false)}
        initialNetRate={hotelsCatalog[0]?.netRate || 800}
        initialBarRate={hotelsCatalog[0]?.barRate || 1200}
      />
      <CouncilGovernanceModal
        isOpen={isCouncilModalOpen}
        onClose={() => setIsCouncilModalOpen(false)}
      />
      <ExtranetModal
        isOpen={isExtranetModalOpen}
        onClose={() => setIsExtranetModalOpen(false)}
        hotels={hotelsCatalog}
        onUpdateHotel={handleUpdateHotel}
      />
    </div>
  );
}

