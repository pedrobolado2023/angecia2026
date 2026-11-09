if (typeof window !== "undefined") {
  throw new Error(
    "[SEGURANÇA HÓSPEDE CLUB] Violação detectada: serverEnv.ts é restrito exclusivamente ao Backend."
  );
}

export interface ServerOmnibeesConfig {
  backendApiUrl: string;
  backendInternalToken: string;
  databaseUrl: string;
  environment: "sandbox" | "production";
  endpointUrl: string;
  requestorId: string;
  username: string;
  apiKey: string;
  webhookSecret: string;
  ratePlanNetCode: string;
  ratePlanBarCode: string;
  staysnetApiUrl: string;
  staysnetClientId: string;
  staysnetClientSecret: string;
  paymentGatewayProvider: string;
  paymentGatewayApiKey: string;
  paymentWebhookSecret: string;
  whatsappCloudApiToken: string;
  whatsappPhoneNumberId: string;
  emailMarketingApiKey: string;
  adminPasscode: string;
  adminSessionSecret: string;
}

/**
 * Lê todas as credenciais EXCLUSIVAMENTE das variáveis de ambiente do servidor (process.env).
 * Nenhuma chave ou senha fica escrita no código-fonte (Zero-Leak para o GitHub).
 */
export function getServerOmnibeesConfig(): ServerOmnibeesConfig {
  return {
    backendApiUrl: process.env.BACKEND_API_URL || "",
    backendInternalToken: process.env.BACKEND_INTERNAL_API_TOKEN || "",
    databaseUrl: process.env.DATABASE_URL || "",
    environment:
      process.env.OMNIBEES_ENVIRONMENT === "production" ? "production" : "sandbox",
    endpointUrl:
      process.env.OMNIBEES_ENDPOINT_URL ||
      "https://cert.api.omnibees.com/ota2014b/PullService.svc",
    requestorId: process.env.OMNIBEES_REQUESTOR_ID || "",
    username: process.env.OMNIBEES_USERNAME || "",
    apiKey: process.env.OMNIBEES_API_KEY || "",
    webhookSecret: process.env.OMNIBEES_WEBHOOK_SECRET || "",
    ratePlanNetCode: process.env.OMNIBEES_RATE_PLAN_NET || "RATE_NET_CLUB",
    ratePlanBarCode: process.env.OMNIBEES_RATE_PLAN_BAR || "RATE_BAR_PUBLIC",
    staysnetApiUrl: process.env.STAYSNET_API_URL || "",
    staysnetClientId: process.env.STAYSNET_CLIENT_ID || "",
    staysnetClientSecret: process.env.STAYSNET_CLIENT_SECRET || "",
    paymentGatewayProvider: process.env.PAYMENT_GATEWAY_PROVIDER || "ASAAS_PIX",
    paymentGatewayApiKey: process.env.PAYMENT_GATEWAY_API_KEY || "",
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
    whatsappCloudApiToken: process.env.WHATSAPP_CLOUD_API_TOKEN || "",
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    emailMarketingApiKey: process.env.EMAIL_MARKETING_API_KEY || "",
    adminPasscode:
      process.env.HOSPEDE_ADMIN_PASSCODE ||
      process.env.VANTAGGI_ADMIN_PASSCODE ||
      process.env.VELLUTO_ADMIN_PASSCODE ||
      "",
    adminSessionSecret:
      process.env.HOSPEDE_ADMIN_SESSION_SECRET ||
      process.env.VANTAGGI_ADMIN_SESSION_SECRET ||
      process.env.VELLUTO_ADMIN_SESSION_SECRET ||
      "",
  };
}

export function maskSecret(value: string): string {
  if (!value) return "Não configurado no .env";
  if (value.length < 6) return "••••••••";
  const prefix = value.slice(0, 3);
  const suffix = value.slice(-3);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Retorna apenas o status mascarado das variáveis de ambiente para exibição segura
 * no Painel Administrativo (sem nunca trafegar a chave bruta em JSON para o navegador).
 */
export function getMaskedEnvStatusForAdmin() {
  const cfg = getServerOmnibeesConfig();
  const vars = [
    {
      envName: "BACKEND_API_URL",
      channel: "Site <-> Backend",
      rawValue: cfg.backendApiUrl,
      isSecret: false,
    },
    {
      envName: "BACKEND_INTERNAL_API_TOKEN",
      channel: "Site <-> Backend",
      rawValue: cfg.backendInternalToken,
      isSecret: true,
    },
    {
      envName: "DATABASE_URL",
      channel: "Banco PostgreSQL / Supabase",
      rawValue: cfg.databaseUrl,
      isSecret: true,
    },
    {
      envName: "HOSPEDE_ADMIN_PASSCODE",
      channel: "Portal Gestor (Admin)",
      rawValue: cfg.adminPasscode,
      isSecret: true,
    },
    {
      envName: "OMNIBEES_ENVIRONMENT",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.environment,
      isSecret: false,
    },
    {
      envName: "OMNIBEES_ENDPOINT_URL",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.endpointUrl,
      isSecret: false,
    },
    {
      envName: "OMNIBEES_REQUESTOR_ID",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.requestorId,
      isSecret: true,
    },
    {
      envName: "OMNIBEES_USERNAME",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.username,
      isSecret: true,
    },
    {
      envName: "OMNIBEES_API_KEY",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.apiKey,
      isSecret: true,
    },
    {
      envName: "OMNIBEES_WEBHOOK_SECRET",
      channel: "Canal 01: Omnibees",
      rawValue: cfg.webhookSecret,
      isSecret: true,
    },
    {
      envName: "STAYSNET_CLIENT_ID",
      channel: "Canal 02: Villas / Temporada",
      rawValue: cfg.staysnetClientId,
      isSecret: true,
    },
    {
      envName: "STAYSNET_CLIENT_SECRET",
      channel: "Canal 02: Villas / Temporada",
      rawValue: cfg.staysnetClientSecret,
      isSecret: true,
    },
    {
      envName: "PAYMENT_GATEWAY_API_KEY",
      channel: "Canal 03: Gateway PIX/Cartão",
      rawValue: cfg.paymentGatewayApiKey,
      isSecret: true,
    },
    {
      envName: "PAYMENT_WEBHOOK_SECRET",
      channel: "Canal 03: Gateway PIX/Cartão",
      rawValue: cfg.paymentWebhookSecret,
      isSecret: true,
    },
    {
      envName: "WHATSAPP_CLOUD_API_TOKEN",
      channel: "Canal 04: Campanhas Membros",
      rawValue: cfg.whatsappCloudApiToken,
      isSecret: true,
    },
  ];

  return {
    environment: cfg.environment,
    endpointUrl: cfg.endpointUrl,
    requestorIdMasked: maskSecret(cfg.requestorId),
    usernameMasked: maskSecret(cfg.username),
    apiKeyMasked: maskSecret(cfg.apiKey),
    webhookSecretMasked: maskSecret(cfg.webhookSecret),
    paymentGatewayProvider: cfg.paymentGatewayProvider,
    paymentGatewayApiKeyMasked: maskSecret(cfg.paymentGatewayApiKey),
    paymentWebhookSecretMasked: maskSecret(cfg.paymentWebhookSecret),
    ratePlanNetCode: cfg.ratePlanNetCode,
    ratePlanBarCode: cfg.ratePlanBarCode,
    envVariablesStatus: vars.map((v) => ({
      envName: v.envName,
      configured: Boolean(v.rawValue && v.rawValue.trim().length > 0),
      maskedValue: v.rawValue
        ? v.isSecret
          ? maskSecret(v.rawValue)
          : v.rawValue
        : "Aguardando preenchimento no .env",
      scope: v.channel,
    })),
  };
}
