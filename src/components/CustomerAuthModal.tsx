"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { isValidCPF } from "@/lib/cpfValidator";

export interface LoggedCustomer {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  cpf?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  membership?: {
    status: "TRIAL_ACTIVE" | "EXPIRED" | "ACTIVE_BY_BOOKING" | "SUBSCRIBED";
    trialStartedAt: string;
    trialExpiresAt: string;
    daysRemaining: number;
    subscriptionPlan?: {
      active: boolean;
      priceBRL: number;
      billingCycle: "monthly";
      nextBillingAt?: string;
      paymentMethod?: "PIX" | "CARD";
    };
  };
}

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (customer: LoggedCustomer) => void;
  initialMode?: "register" | "login";
  checkoutContextNotice?: string;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = "register",
  checkoutContextNotice,
}: CustomerAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"register" | "login" | "verify">(
    initialMode === "login" ? "login" : "register"
  );

  // Formulário de Cadastro
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Formulário de Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Verificação de Código WhatsApp
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [verificationTarget, setVerificationTarget] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [previewDevCode, setPreviewDevCode] = useState<string | null>(null);
  const [selfNumberNotice, setSelfNumberNotice] = useState<boolean>(false);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessNotice(null);
      if (initialMode === "login") {
        setActiveTab("login");
      }
    }
  }, [isOpen, initialMode]);

  // Contagem regressiva do reenvio de código WhatsApp
  useEffect(() => {
    if (activeTab === "verify" && resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, resendCountdown]);

  if (!isOpen) return null;

  // Formatação de Máscaras
  const formatPhoneMask = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  const formatCpfMask = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  };

  const formatCepMask = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  // Consulta automática do ViaCEP
  const handleCepLookup = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, "");
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
        }
      } catch {
        // silencioso
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // SUBMIT 1: Cadastro de Cliente
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!fullName.trim() || fullName.trim().split(" ").length < 2) {
      setErrorMessage("Por favor, digite seu Nome Completo (Nome e Sobrenome).");
      return;
    }

    const cleanCpfDigits = cpf.replace(/\D/g, "");
    if (!isValidCPF(cleanCpfDigits)) {
      setErrorMessage("CPF inválido. Por favor, digite um CPF válido.");
      return;
    }

    const cleanPhoneDigits = whatsapp.replace(/\D/g, "");
    if (cleanPhoneDigits.length < 10) {
      setErrorMessage("Telefone WhatsApp inválido. Digite o DDD + Número celular.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Informe um endereço de e-mail válido.");
      return;
    }

    if (!cep.trim() || !street.trim() || !city.trim() || !state.trim()) {
      setErrorMessage("Preencha seu endereço completo (CEP, Rua, Cidade e Estado).");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          whatsapp,
          cpf,
          email,
          password: password || undefined,
          address: {
            cep,
            street,
            number: number || "S/N",
            complement,
            neighborhood,
            city,
            state,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Erro ao realizar cadastro.");
        setIsLoading(false);
        return;
      }

      if (data.customer) {
        onAuthSuccess(data.customer);
      }

      setVerificationTarget(email);
      setPreviewDevCode(data.previewCode || null);
      setSelfNumberNotice(Boolean(data.selfNumberError));
      setSuccessNotice(data.message);
      setActiveTab("verify");
      setResendCountdown(60);
    } catch {
      setErrorMessage("Falha de conexão com o servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT 2: Verificação do Código de 6 Dígitos
  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const fullCode = verificationCode.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Por favor, preencha os 6 dígitos do código.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: verificationTarget || email || whatsapp || loginIdentifier,
          code: fullCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Código incorreto ou expirado.");
        setIsLoading(false);
        return;
      }

      // Sucesso na verificação!
      onAuthSuccess(data.customer);
      onClose();
    } catch {
      setErrorMessage("Falha ao validar código. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar Código WhatsApp
  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: verificationTarget || email || whatsapp || loginIdentifier,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setSuccessNotice(data.message);
        setPreviewDevCode(data.previewCode || null);
        setSelfNumberNotice(Boolean(data.selfNumberError));
        setResendCountdown(60);
      } else {
        setErrorMessage(data.error || "Erro ao reenviar código.");
      }
    } catch {
      setErrorMessage("Erro ao solicitar novo código.");
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT 3: Login de Cliente
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!loginIdentifier.trim()) {
      setErrorMessage("Digite seu E-mail ou CPF cadastrado.");
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage("Digite sua Senha de Acesso.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          secret: loginPassword,
          mode: "password",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Credenciais inválidas.");
        setIsLoading(false);
        return;
      }

      // Sucesso no login!
      onAuthSuccess(data.customer);
      onClose();
    } catch {
      setErrorMessage("Falha ao realizar login. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182026]/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-white text-[#182026] border border-[#DFD5C5] rounded-3xl shadow-2xl my-auto overflow-hidden animate-slide-up">
        {/* Cabeçalho do Modal */}
        <div className="bg-[#FAF7F2] border-b border-[#EAE3D5] p-5 sm:p-6 flex items-start justify-between relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8863B]/10 text-[#9A6D28] text-[10px] font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#B8863B]" />
              <span>Acesso Privado Hóspede Club</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#182026]">
              {activeTab === "verify"
                ? "Validação de Segurança"
                : activeTab === "register"
                ? "Ativar 7 Dias de Membro VIP"
                : "Entrar na sua Conta"}
            </h2>
            <p className="text-xs text-[#5C646B] mt-1">
              {activeTab === "verify"
                ? "Confirme o código recebido no seu WhatsApp para liberar seu acesso."
                : activeTab === "register"
                ? "Preencha seus dados para ter 7 dias de degustação com tarifas de até 28% OFF."
                : "Acesse suas reservas, tarifas exclusivas e perfil de membro."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5C646B] hover:text-[#182026] hover:bg-[#EAE3D5] transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de Contexto de Checkout */}
        {checkoutContextNotice && activeTab !== "verify" && (
          <div className="px-5 sm:px-6 pt-4">
            <div className="p-3 rounded-xl bg-[#0F5257]/10 border border-[#0F5257]/20 text-xs text-[#0F5257] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#0F5257]" />
              <span>{checkoutContextNotice}</span>
            </div>
          </div>
        )}

        {/* Abas de Navegação (quando não estiver verificando código) */}
        {activeTab !== "verify" && (
          <div className="flex border-b border-[#EAE3D5] px-5 sm:px-6 pt-2">
            <button
              onClick={() => {
                setActiveTab("register");
                setErrorMessage(null);
              }}
              className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                activeTab === "register"
                  ? "border-[#B8863B] text-[#9A6D28]"
                  : "border-transparent text-[#5C646B] hover:text-[#182026]"
              }`}
            >
              Criar Cadastro VIP (7 Dias Grátis)
            </button>
            <button
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
              }}
              className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                activeTab === "login"
                  ? "border-[#B8863B] text-[#9A6D28]"
                  : "border-transparent text-[#5C646B] hover:text-[#182026]"
              }`}
            >
              Já sou Membro (Entrar)
            </button>
          </div>
        )}

        {/* Mensagens de Alerta e Sucesso */}
        <div className="px-5 sm:px-6 pt-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#B83B2B]/10 border border-[#B83B2B]/30 text-xs text-[#B83B2B] flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {selfNumberNotice && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong className="block mb-1 font-semibold text-amber-950">Aviso sobre o WhatsApp:</strong>
              O número cadastrado é o mesmo número conectado ao disparador oficial da agência (+55 62 99347-3656). O WhatsApp não autoriza envio de mensagens para o próprio número da conta conectada. Utilize o código de acesso abaixo para testar ou cadastre outro número para receber no celular.
            </div>
          )}

          {previewDevCode && !selfNumberNotice && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>Código WhatsApp para testes:</span>
              <strong className="font-mono text-sm tracking-widest text-[#B8863B]">{previewDevCode}</strong>
            </div>
          )}

          {previewDevCode && selfNumberNotice && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-xs text-amber-950 flex items-center justify-between">
              <span>Código de ativação gerado:</span>
              <strong className="font-mono text-base tracking-widest text-[#9A6D28] font-bold">{previewDevCode}</strong>
            </div>
          )}
        </div>

        {/* CONTEÚDO 1: CADASTRO COMPLETO */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  Nome Completo *
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Pedro Henrique Pereira"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  Telefone Celular (WhatsApp) *
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhoneMask(e.target.value))}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  CPF (Titular da Reserva) *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                />
              </div>

              {/* CEP com Autocomplete */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  CEP Residencial *
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={cep}
                    onChange={(e) => {
                      const v = formatCepMask(e.target.value);
                      setCep(v);
                      handleCepLookup(v);
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                  {isLoadingCep && (
                    <RefreshCw className="w-3.5 h-3.5 text-[#B8863B] animate-spin absolute right-3 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Rua / Logradouro */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  Rua / Logradouro *
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Av. Paulista"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                />
              </div>

              {/* Número e Complemento */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto 42"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
              </div>

              {/* Bairro, Cidade e Estado */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B] uppercase"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  E-mail Oficial *
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                  Criar Senha de Acesso *
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando Código WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <span>Cadastrar & Receber Código no WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-[#5C646B] mt-2">
              Ao cadastrar, você ganha <strong>7 dias de acesso grátis</strong> às tarifas secretas de membro.
            </p>
          </form>
        )}

        {/* CONTEÚDO 2: VALIDAÇÃO DO CÓDIGO WHATSAPP */}
        {activeTab === "verify" && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-editorial text-2xl font-normal text-[#182026]">
                Digite o Código de 6 Dígitos
              </h3>
              <p className="text-xs text-[#5C646B] mt-1.5 max-w-sm mx-auto">
                Enviamos um código via WhatsApp para confirmar seu número e ativar seus 7 dias de Membro VIP.
              </p>
            </div>

            {/* Inputs dos 6 dígitos */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {verificationCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    codeInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const newArr = [...verificationCode];
                    newArr[idx] = val;
                    setVerificationCode(newArr);

                    if (val && idx < 5) {
                      codeInputRefs.current[idx + 1]?.focus();
                    }

                    // Se preencheu todos os 6 dígitos, dispara verificação automática
                    if (val && idx === 5 && newArr.every((d) => d !== "")) {
                      setTimeout(() => handleVerifySubmit(), 100);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && idx > 0) {
                      codeInputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-semibold bg-[#FAF7F2] border-2 border-[#E2D9C8] focus:border-[#B8863B] rounded-xl text-[#182026] focus:outline-none transition shadow-2xs"
                />
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleVerifySubmit()}
                disabled={isLoading || verificationCode.some((d) => !d)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validando Código...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ativar Minha Conta de Membro VIP</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-[#5C646B] hover:text-[#182026] underline cursor-pointer"
                >
                  Corrigir dados cadastrados
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCountdown > 0 || isLoading}
                  className={`font-medium cursor-pointer ${
                    resendCountdown > 0
                      ? "text-[#5C646B]/60 cursor-not-allowed"
                      : "text-[#9A6D28] hover:underline"
                  }`}
                >
                  {resendCountdown > 0
                    ? `Reenviar código em ${resendCountdown}s`
                    : "Reenviar código agora"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO 3: LOGIN DE CLIENTE */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                E-mail ou CPF Cadastrado *
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="seu@email.com ou 000.000.000-00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#5C646B] mb-1">
                Senha de Acesso *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#9A6D28] absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-xs sm:text-sm text-[#182026] focus:outline-none focus:border-[#B8863B]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Acessando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Hóspede Club</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                }}
                className="text-xs text-[#9A6D28] hover:underline cursor-pointer"
              >
                Não tem cadastro? Crie sua conta e ganhe 7 dias de Membro VIP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

