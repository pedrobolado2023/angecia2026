/**
 * HÓSPEDE CLUB — Motor Comercial de Precificação & Proteção de Margem (Seções 2 e 6)
 *
 * Regras Inegociáveis do Agente 02 (Auditor de RM & Margem) e Agente 03 (API):
 * 1. Preço de Venda Base (Sell Rate) = Tarifa Net * (1 + Markup_0.15)
 * 2. Proteção contra Tarifa Zero / Negativa ou Venda Abaixo do Net (Hard Floor Guardrail)
 * 3. Estímulo Máximo ao PIX:
 *    - Custo de Gateway PIX: 0,80% (entre 0,5% e 0,99%)
 *    - Markup bruto de ancoragem à vista (18%) com desconto psicológico no PIX que preserva >= 15,00% de lucro líquido real sobre a Tarifa Net
 *    - Benefícios embutidos: Upgrade de Cortesia (mediante disponibilidade) + 3% de Cashback imediato na próxima reserva
 * 4. Repasse Inteligente de Taxas no Cartão (Parcelamento 1x a 12x):
 *    - Parcelas 1x a 3x: Taxa MDR base ajustada para manter os 15% líquidos sobre o Net
 *    - Parcelas 4x a 12x: Juros de antecipação + MDR do gateway (4,69% a 8,90%) embutidos nas parcelas a partir da 4ª vez, mantendo os 15,00% de margem líquida intactos sobre a Tarifa Net
 * 5. Arbitragem de Paridade Tarifária (Rate Parity):
 *    - Visitante não logado vê a Tarifa Oficial (BAR - Best Available Rate) com o selo bloqueado do Hóspede Club
 *    - Membro logado acessa a "Tarifa Secreta de Membro" (ancoragem De / Por real)
 * 6. Gate 6 (Hóspede Villas & Private Homes):
 *    - Taxa de limpeza (cleaningFee) e Caução (securityDeposit) são separadas do cálculo do markup de 15% da diária.
 */

export interface InstallmentOption {
  installments: number;
  gatewayFeePercent: number;      // MDR + antecipação em %
  totalCharged: number;           // Valor total cobrado do cliente (1 diária)
  installmentValue: number;       // Valor de cada parcela (1 diária)
  gatewayFeeAmount: number;       // Valor retido pelo gateway
  netProfitAmount: number;        // Lucro líquido real (Receita Líquida - Tarifa Net)
  netMarginOnNetPercent: number;  // % de lucro líquido sobre a Tarifa Net (sempre >= 15%)
  isInterestFreeLabel: boolean;   // Até 3x exibido como base curta sem juros de antecipação longa
}

export interface PricingCalculationResult {
  netRate: number;
  barRate: number; // Tarifa Pública Oficial do Hotel (BAR)
  markupTargetPercent: number; // 15% (0.15)
  baseSellRate: number; // Net * 1.15
  // Segregação Gate 6 (Villas & Temporada)
  villaFees: {
    cleaningFee: number;
    securityDeposit: number;
    isSegregatedFromMarkup: boolean;
  };
  // Modalidade 1: PIX (Lucro Líquido Máximo)
  pix: {
    grossAnchorRate: number; // Net * 1.18 (Markup bruto de 18%)
    pixPrice: number;        // Valor final da diária no PIX garantindo 15% líquidos livres de gateway (0.80%)
    gatewayFeePercent: number;
    gatewayFeeAmount: number;
    netProfitAmount: number;
    netMarginOnNetPercent: number;
    savingsVsBar: number;
    savingsVsBarPercent: number;
    cashbackNextBooking: number; // 3% de cashback para próxima reserva
    perks: string[];
  };
  // Modalidade 2: Cartão em até 12x com repasse inteligente
  creditCard: {
    baseCardPrice: number;
    installments: InstallmentOption[];
  };
  // Modalidade 3: Paridade Tarifária (Hóspede Club)
  parity: {
    isBelowBar: boolean;
    publicDisplayPrice: number; // Respeita paridade pública (BAR)
    memberSecretPrice: number;  // Preço exclusivo logado no Hóspede Club
    memberSavingsAmount: number;
    memberSavingsPercent: number;
  };
  // Auditoria de Segurança Financeira (Agente 02)
  audit: {
    isValid: boolean;
    guardrailTriggered: boolean;
    guardrailMessage: string | null;
    minGuaranteedMarginPercent: number;
  };
}

// Tabela progressiva de MDR + Antecipação do Gateway (1x a 12x)
const GATEWAY_CARD_RATES: Record<number, number> = {
  1: 0.0299,  // 2,99%
  2: 0.0349,  // 3,49%
  3: 0.0389,  // 3,89%
  4: 0.0469,  // 4,69% (Início do repasse de antecipação a partir da 4ª parcela)
  5: 0.0529,  // 5,29%
  6: 0.0589,  // 5,89%
  7: 0.0649,  // 6,49%
  8: 0.0699,  // 6,99%
  9: 0.0749,  // 7,49%
  10: 0.0799, // 7,99%
  11: 0.0845, // 8,45%
  12: 0.0890, // 8,90%
};

const PIX_GATEWAY_FEE = 0.008; // 0,80% custo de transação PIX

export function calculateHospedePricing(
  netRateInput: number,
  barRateInput?: number,
  customMarkup: number = 0.15,
  cleaningFeeInput: number = 0,
  securityDepositInput: number = 0
): PricingCalculationResult {
  // Trava contra tarifa zero, negativa ou inválida (Agente 02 FinOps Guardrail)
  if (!Number.isFinite(netRateInput) || netRateInput <= 50) {
    throw new Error(
      `[FINOPS GUARDRAIL BLOCK] Tarifa Net inválida ou abaixo do piso operacional de segurança (Recebido: R$ ${netRateInput}). Reserva bloqueada.`
    );
  }

  const markup = Math.max(0.15, customMarkup); // Nunca permite markup menor que 15%
  const netRate = Math.round(netRateInput * 100) / 100;
  const cleaningFee = Math.max(0, Math.round(cleaningFeeInput * 100) / 100);
  const securityDeposit = Math.max(0, Math.round(securityDepositInput * 100) / 100);

  // Sell Rate Base = Tarifa Net * (1 + 0.15)
  const baseSellRate = Math.round(netRate * (1 + markup) * 100) / 100;

  // Para que (PreçoCobrado * (1 - taxaGateway)) - TarifaNet = TarifaNet * 0.15:
  // PreçoCobrado = (TarifaNet * (1 + markup)) / (1 - taxaGateway)
  const grossAnchorRate = Math.round(netRate * 1.18 * 100) / 100;
  const exactPixPrice = Math.ceil((baseSellRate / (1 - PIX_GATEWAY_FEE)) * 100) / 100;
  const pixFeeAmount = Math.round(exactPixPrice * PIX_GATEWAY_FEE * 100) / 100;
  const pixNetProfit = Math.round((exactPixPrice - pixFeeAmount - netRate) * 100) / 100;
  const pixMarginPercent = Math.round((pixNetProfit / netRate) * 10000) / 100;

  // Se o hotel não informou BAR ou se BAR for menor que o nosso preço público, estimamos BAR realista de balcão (+38% sobre Net)
  const barRate =
    barRateInput && barRateInput > exactPixPrice
      ? Math.round(barRateInput * 100) / 100
      : Math.round(netRate * 1.38 * 100) / 100;

  const savingsVsBar = Math.max(0, Math.round((barRate - exactPixPrice) * 100) / 100);
  const savingsVsBarPercent = Math.round((savingsVsBar / barRate) * 100);

  // Cálculo das 12 parcelas no Cartão garantindo 15,00% líquidos sobre o Net em TODAS as faixas
  const installments: InstallmentOption[] = [];
  for (let n = 1; n <= 12; n++) {
    const feeRate = GATEWAY_CARD_RATES[n] ?? 0.089;
    // Garante que após descontar (totalCharged * feeRate), sobre exatamente Net * (1 + markup)
    const totalCharged = Math.ceil((baseSellRate / (1 - feeRate)) * 100) / 100;
    const installmentValue = Math.ceil((totalCharged / n) * 100) / 100;
    const gatewayFeeAmount = Math.round(totalCharged * feeRate * 100) / 100;
    const netProfitAmount = Math.round((totalCharged - gatewayFeeAmount - netRate) * 100) / 100;
    const netMarginOnNetPercent = Math.round((netProfitAmount / netRate) * 10000) / 100;

    installments.push({
      installments: n,
      gatewayFeePercent: Math.round(feeRate * 10000) / 100,
      totalCharged,
      installmentValue,
      gatewayFeeAmount,
      netProfitAmount,
      netMarginOnNetPercent,
      isInterestFreeLabel: n <= 3,
    });
  }

  const minMargin = Math.min(
    pixMarginPercent,
    ...installments.map((i) => i.netMarginOnNetPercent)
  );

  return {
    netRate,
    barRate,
    markupTargetPercent: Math.round(markup * 10000) / 100,
    baseSellRate,
    villaFees: {
      cleaningFee,
      securityDeposit,
      isSegregatedFromMarkup: true,
    },
    pix: {
      grossAnchorRate,
      pixPrice: exactPixPrice,
      gatewayFeePercent: PIX_GATEWAY_FEE * 100,
      gatewayFeeAmount: pixFeeAmount,
      netProfitAmount: pixNetProfit,
      netMarginOnNetPercent: pixMarginPercent,
      savingsVsBar,
      savingsVsBarPercent,
      cashbackNextBooking: Math.round(exactPixPrice * 0.03 * 100) / 100,
      perks: [
        "Menor tarifa garantida à vista no PIX",
        "3% de Cashback imediato creditado no Hóspede Club",
        "Confirmação prioritária via Omnibees Push em 3 segundos",
      ],
    },
    creditCard: {
      baseCardPrice: installments[0].totalCharged,
      installments,
    },
    parity: {
      isBelowBar: exactPixPrice < barRate,
      publicDisplayPrice: barRate,
      memberSecretPrice: exactPixPrice,
      memberSavingsAmount: savingsVsBar,
      memberSavingsPercent: savingsVsBarPercent,
    },
    audit: {
      isValid: minMargin >= 15.0 && exactPixPrice > netRate,
      guardrailTriggered: false,
      guardrailMessage: null,
      minGuaranteedMarginPercent: minMargin,
    },
  };
}

// Alias para compatibilidade
export const calculateVellutoPricing = calculateHospedePricing;
