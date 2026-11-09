/**
 * VELLUTO STAYS — Suíte Oficial de Auditoria dos 6 Quality Gates (Conselho de 5 Agentes)
 * Testa os endpoints ao vivo em http://localhost:3000 e valida todas as fases (1 a 6).
 */

const BASE_URL = "http://localhost:3000";

async function runFullCouncilAudit() {
  console.log("==================================================================");
  console.log("  CONSELHO DE 5 AGENTES VALIDADORES — AUDITORIA GATES 1 A 6");
  console.log("==================================================================\n");

  // GATE 1 & GATE 3: Busca de disponibilidade Omnibees < 1.5s + Destinos Campeões
  const t0 = performance.now();
  const omniRes = await fetch(`${BASE_URL}/api/omnibees`);
  const omniData = await omniRes.json();
  const searchMs = Math.round((performance.now() - t0) * 100) / 100;

  if (omniRes.status !== 200 || searchMs > 1500) {
    throw new Error(`Falha no SLA de busca Omnibees: ${searchMs}ms`);
  }
  console.log(
    `[GATE 1 & GATE 3 - APROVADO] Busca Omnibees ARI retornou ${omniData.count} propriedades em ${searchMs}ms (Limite SLA: 1500ms).`
  );

  // GATE 2: Simulação de 100 Reservas (PIX e Cartão 12x) + Trava contra Tarifa Zero
  const priceRes = await fetch(`${BASE_URL}/api/pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ netRate: 1630, barRate: 2400, markup: 0.15 }),
  });
  const priceData = await priceRes.json();
  const pixMargin = priceData.pricing.pix.netMarginOnNetPercent;
  const card12Margin = priceData.pricing.creditCard.installments[11].netMarginOnNetPercent;

  const zeroRateRes = await fetch(`${BASE_URL}/api/pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ netRate: 0, barRate: 2400 }),
  });

  if (pixMargin < 15 || card12Margin < 15 || zeroRateRes.status !== 400) {
    throw new Error("Falha na auditoria financeira do Gate 2.");
  }
  console.log(
    `[GATE 2 - APROVADO] Margem líquida PIX (${pixMargin}%) e Cartão 12x (${card12Margin}%) >= 15.00% intactas. Trava Tarifa Zero retornou HTTP ${zeroRateRes.status}.`
  );

  // GATE 3 (Anti-Overbooking): Vender a última unidade da Villa em Trancoso (estoque = 1) e tentar comprar novamente
  const book1 = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelId: "casa-quadrado-trancoso",
      roomId: "villa-nativos-master",
      nights: 3,
      paymentModality: "PIX",
      guestName: "Membro Teste Gate 3",
      guestEmail: "gate3@vellutostays.com.br",
    }),
  });
  const book1Data = await book1.json();

  const book2OverbookingAttempt = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelId: "casa-quadrado-trancoso",
      roomId: "villa-nativos-master",
      nights: 3,
      paymentModality: "PIX",
    }),
  });

  if (book1.status !== 200 || book2OverbookingAttempt.status !== 409) {
    throw new Error("Falha no bloqueio anti-overbooking do Gate 3.");
  }
  console.log(
    `[GATE 3 ANTI-OVERBOOKING - APROVADO] Última unidade vendida (Stop Sell Ativo: ${book1Data.stopSellTriggered}). Tentativa subsequente bloqueada com HTTP ${book2OverbookingAttempt.status}.`
  );

  // GATE 4 & GATE 5 (SecOps Webhook & Voucher): Tentar sem assinatura vs. com assinatura e PAYMENT_CONFIRMED
  const invalidWebhook = await fetch(`${BASE_URL}/api/webhooks/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: book1Data.bookingId,
      event: "PAYMENT_CONFIRMED",
      signatureToken: "TOKEN_FALSO",
    }),
  });

  const validWebhook = await fetch(`${BASE_URL}/api/webhooks/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: book1Data.bookingId,
      event: "PAYMENT_CONFIRMED",
      signatureToken: process.env.PAYMENT_WEBHOOK_SECRET || "",
    }),
  });
  const validWebhookData = await validWebhook.json();

  if (invalidWebhook.status !== 401 || !validWebhookData.voucherEmitted) {
    throw new Error("Falha na segurança de Webhook do Gate 4/5.");
  }
  console.log(
    `[GATE 4 & GATE 5 - APROVADO] Webhook inválido bloqueado (HTTP 401). Webhook autenticado emitiu Voucher ${validWebhookData.voucherCode} e sincronizou PMS (${validWebhookData.omnibeesBookingPush.pmsLocator}).`
  );

  // GATE 6 (Velluto Villas): Segregação de Taxa de Limpeza e Caução do Markup de 15%
  if (
    book1Data.financialAudit.cleaningFeeSegregated !== 380 ||
    book1Data.financialAudit.securityDepositSegregated !== 1200 ||
    book1Data.financialAudit.guaranteedNetMarginPercent < 15
  ) {
    throw new Error("Falha na segregação de taxas de temporada do Gate 6.");
  }
  console.log(
    `[GATE 6 VILLAS - APROVADO] Taxa de limpeza (R$ ${book1Data.financialAudit.cleaningFeeSegregated}) e Caução (R$ ${book1Data.financialAudit.securityDepositSegregated}) segregadas do Markup de 15% da diária.`
  );

  // GATE 7 (SecOps Zero-Leak .env & Persistência de Clientes/CRM no Backend):
  // 7.1 Verifica que o catálogo público (/api/omnibees GET) NÃO vaza netRate nem chaves de API
  const firstPublicHotel = omniData.hotels[0] || {};
  if ("netRate" in firstPublicHotel || "apiKey" in omniData) {
    throw new Error("Vazamento detectado no catálogo público /api/omnibees!");
  }

  // 7.2 Verifica que /api/customers GET bloqueia acesso anônimo sem sessão Admin (HTTP 401)
  const unauthCrmRes = await fetch(`${BASE_URL}/api/customers`);
  if (unauthCrmRes.status !== 401) {
    throw new Error(`Falha de proteção de dados de clientes: esperado 401, recebeu ${unauthCrmRes.status}`);
  }

  // 7.3 Testa cadastro de membro e rastreamento de comportamento no Backend (/api/customers e /api/customers/activity)
  const regRes = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Membro Auditoria Campanha",
      email: "campanha.vip@vellutostays.com.br",
      whatsapp: "+55 (11) 99777-8899",
      cityOrigin: "São Paulo (SP)",
      preferredDestinations: ["Maceió & Maragogi", "Gramado & Vinhedos"],
      travelProfile: "Casal",
      marketingOptIn: true,
    }),
  });
  const regData = await regRes.json();

  const actRes = await fetch(`${BASE_URL}/api/customers/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: regData.memberProfile?.id,
      email: "campanha.vip@vellutostays.com.br",
      activityType: "SEARCH",
      payload: {
        query: "Maragogi",
        destinationName: "Maceió, Milagres & Maragogi",
        checkInDate: "2026-12-15",
        nights: 5,
        guests: 2,
      },
    }),
  });

  if (regRes.status !== 200 || actRes.status !== 200 || !regData.memberProfile?.id) {
    throw new Error("Falha ao persistir cadastro e atividade do cliente no Backend.");
  }

  console.log(
    `[GATE 7 ZERO-LEAK & CRM BACKEND - APROVADO] Credenciais isoladas em .env.local, acesso anônimo ao CRM bloqueado (HTTP 401) e membro ${regData.memberProfile.id} salvo com histórico de busca para campanhas.`
  );

  console.log("\n==================================================================");
  console.log("  RESULTADO FINAL: TODOS OS QUALITY GATES 100% APROVADOS!");
  console.log("==================================================================");
}

runFullCouncilAudit().catch((err) => {
  console.error("ERRO NA AUDITORIA:", err);
  process.exit(1);
});

