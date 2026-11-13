/**
 * HÓSPEDE CLUB — Motor Oficial de Políticas de Cancelamento e Alteração de Data
 * 
 * Regras Hóspede Club:
 * 1. Reservas para o mesmo dia ou dia seguinte (D-0 ou D-1) são AUTOMATICAMENTE NÃO REEMBOLSÁVEIS.
 * 2. Se a Hotelbeds fornecer a política oficial daquele hotel/quarto (cancellationPolicies),
 *    utiliza-se a política oficial informada pela Hotelbeds.
 * 3. Caso a Hotelbeds NÃO disponibilize a política daquele hotel (ou em fallback de inventário próprio),
 *    aplica-se a Política Oficial do Hóspede Club:
 *    - 1º) Cancelamento:
 *          a) Gratuito: até 14 dias antes do check-in.
 *          b) 50% do valor total da reserva: se o cancelamento ocorrer até 01 dia antes do check-in.
 *          c) 100% do valor total da reserva: se o cancelamento ocorrer no mesmo dia do check-in.
 *    - 2º) No-show (não comparecimento): multa de 100% do valor pago.
 *    - 3º) Saída Antecipada: não reembolsável.
 *    - 4º) Pré-pagamento: integral no momento da confirmação.
 *    - 5º) Alteração de Data: política alterada para Não Reembolsável + ajuste tarifário vigente.
 *    - 6º) Tarifa Não Reembolsável: Réveillon, Natal, Carnaval e Feriados Nacionais.
 */

export interface ResolvedCancellationPolicy {
  isNonRefundable: boolean;
  policyType: "IMMEDIATE_CHECKIN_NRF" | "HOTELBEDS_OFFICIAL" | "HOSPEDE_CLUB_DEFAULT" | "NRF_SPECIAL";
  label: string;
  badgeClass: string;
  shortSummary: string;
  details: string;
  freeCancellationUntilDate?: string;
  cutoffDate14Days?: string;
  cutoffDate1Day?: string;
  hotelbedsPenaltyBRL?: number;
  penaltyPercentage?: number;
}

export const HOSPEDE_CLUB_STANDARD_TERMS = {
  title: "Política de Cancelamento e Alteração de Data",
  clause1: "1º) Cancelamento:\na) Gratuito: Se o cancelamento for feito até 14 dias antes do check-in.\nb) 50% do valor total da reserva: se o cancelamento ocorrer até 01 dia antes do check-in.\nc) 100% do valor total da reserva: se o cancelamento ocorrer no mesmo dia do check-in.",
  clause2: "2º) No-show (não comparecimento):\nEm caso de não comparecimento para hospedagem, será cobrada uma multa de 100% do valor pago.",
  clause3: "3º) Saída Antecipada:\nCaso haja saída antecipada, o valor pago não será reembolsado.",
  clause4: "4º) Pré-pagamento:\nO pagamento total da reserva deverá ser efetuado no momento da confirmação. A reserva será considerada garantida somente após a confirmação do pagamento integral.",
  clause5: "5º) Alteração de Data:\na) A política de cancelamento será alterada para Não Reembolsável.\nb) A reserva será ajustada conforme o tarifário vigente para o novo período desejado.",
  clause6: "6º) Tarifa Não Reembolsável:\na) Para reservas efetuadas durante períodos especiais, como Réveillon, Natal, Carnaval e Feriados Nacionais, a tarifa será não reembolsável. Em caso de cancelamento ou alteração, não haverá reembolso do valor pago.",
  immediateRule: "Atenção: Reservas efetuadas para o mesmo dia ou para o dia seguinte configuram-se automaticamente como Não Reembolsáveis.",
};

export function getDaysUntilCheckIn(checkInDateStr?: string): number {
  if (!checkInDateStr) return 999;
  try {
    const parts = checkInDateStr.split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return 999;
    }
    const [year, month, day] = parts;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(year, month - 1, day);
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export function formatDateBR(dateIsoOrYMD: string): string {
  try {
    if (dateIsoOrYMD.includes("T")) {
      const d = new Date(dateIsoOrYMD);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    const parts = dateIsoOrYMD.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateIsoOrYMD;
  } catch {
    return dateIsoOrYMD;
  }
}

/**
 * Resolve a política de cancelamento completa com base na Hotelbeds,
 * data de check-in e regras do Hóspede Club.
 */
export function resolveRoomCancellationPolicy(
  room: any,
  checkInDateStr?: string
): ResolvedCancellationPolicy {
  const daysUntil = getDaysUntilCheckIn(checkInDateStr);

  // REGRA ESPECIAL 1: Reservas para o mesmo dia (D-0) ou dia seguinte (D-1) -> AUTOMATICAMENTE NÃO REEMBOLSÁVEL
  if (daysUntil <= 1) {
    const isToday = daysUntil <= 0;
    return {
      isNonRefundable: true,
      policyType: "IMMEDIATE_CHECKIN_NRF",
      label: isToday ? "Não Reembolsável (Entrada Hoje)" : "Não Reembolsável (Entrada Amanhã)",
      badgeClass: "bg-[#B83B2B]/10 text-[#B83B2B] border-[#B83B2B]/20",
      shortSummary: "Reserva de última hora (mesmo dia ou dia seguinte) é não reembolsável.",
      details:
        "Atenção: Reservas efetuadas para o mesmo dia ou para o dia seguinte configuram-se automaticamente como Não Reembolsáveis. Em caso de cancelamento, alteração de datas ou no-show, será retida multa de 100% do valor total pago.",
    };
  }

  const rate = room?.rates?.[0];
  const isNrfExplicit =
    rate?.rateClass === "NRF" ||
    /não reembolsável|non-refundable|nrf/i.test(room?.boardBasis || "") ||
    /não reembolsável/i.test(room?.name || "");

  // REGRA ESPECIAL 2: Tarifa NRF explícita da Hotelbeds ou Período Especial
  if (isNrfExplicit) {
    return {
      isNonRefundable: true,
      policyType: "NRF_SPECIAL",
      label: "Tarifa Promocional Não Reembolsável",
      badgeClass: "bg-[#B83B2B]/10 text-[#B83B2B] border-[#B83B2B]/20",
      shortSummary: "Tarifa com desconto agressivo de membro. Não permite cancelamento com reembolso.",
      details:
        "Esta acomodação possui tarifa promocional com desconto exclusivo de membro (ou período festivo especial). Em caso de cancelamento voluntário, alteração de datas ou no-show, não haverá reembolso do valor pago.",
    };
  }

  // REGRA 3: Se a Hotelbeds fornecer política oficial com datas
  const rawPolicies = rate?.cancellationPolicies;
  if (Array.isArray(rawPolicies) && rawPolicies.length > 0) {
    const firstCp = rawPolicies[0];
    if (firstCp && firstCp.from) {
      const deadlineStr = formatDateBR(firstCp.from);
      const fromTime = new Date(firstCp.from).getTime();
      const penaltyAmount = Number(firstCp.amount || 0);

      // Se a data limite da Hotelbeds já estiver vencida em relação a agora
      if (fromTime <= Date.now()) {
        return {
          isNonRefundable: true,
          policyType: "HOTELBEDS_OFFICIAL",
          label: "Tarifa Não Reembolsável (Prazo Expirado)",
          badgeClass: "bg-[#B83B2B]/10 text-[#B83B2B] border-[#B83B2B]/20",
          shortSummary: `O prazo limite de cancelamento sem custos encerrou em ${deadlineStr}.`,
          details: `Política Hotelbeds: O prazo limite concedido pelo hotel para cancelamento gratuito encerrou em ${deadlineStr}. Cancelamentos agora incorrem em penalidade total da tarifa.`,
        };
      }

      const penaltyText =
        penaltyAmount > 0
          ? `Após ${deadlineStr}, haverá taxa de cancelamento de R$ ${penaltyAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`
          : "Após esta data limite, incidirá a penalidade da política do hotel parceiro.";

      return {
        isNonRefundable: false,
        policyType: "HOTELBEDS_OFFICIAL",
        label: `Cancelamento Grátis até ${deadlineStr}`,
        badgeClass: "bg-[#0F5257]/10 text-[#0F5257] border-[#0F5257]/20",
        shortSummary: `Cancelamento gratuito com reembolso integral até ${deadlineStr}.`,
        details: `Política Oficial do Hotel (Hotelbeds): Você pode cancelar gratuitamente com reembolso integral de 100% até o dia ${deadlineStr}. ${penaltyText}`,
        freeCancellationUntilDate: deadlineStr,
        hotelbedsPenaltyBRL: penaltyAmount,
      };
    }
  }

  // REGRA 4: Caso a Hotelbeds NÃO disponibilize a política daquele hotel, aplica-se a POLÍTICA DO HÓSPEDE CLUB
  let cutoff14Str = "14 dias antes";
  let cutoff1Str = "01 dia antes";

  if (checkInDateStr) {
    try {
      const [y, m, d] = checkInDateStr.split("-").map(Number);
      const checkInObj = new Date(y, m - 1, d);

      const d14 = new Date(checkInObj.getTime() - 14 * 24 * 60 * 60 * 1000);
      cutoff14Str = `${String(d14.getDate()).padStart(2, "0")}/${String(d14.getMonth() + 1).padStart(2, "0")}/${d14.getFullYear()}`;

      const d1 = new Date(checkInObj.getTime() - 1 * 24 * 60 * 60 * 1000);
      cutoff1Str = `${String(d1.getDate()).padStart(2, "0")}/${String(d1.getMonth() + 1).padStart(2, "0")}/${d1.getFullYear()}`;
    } catch {}
  }

  // Se estiver a 14 dias ou mais do check-in: Cancelamento 100% Gratuito
  if (daysUntil >= 14) {
    return {
      isNonRefundable: false,
      policyType: "HOSPEDE_CLUB_DEFAULT",
      label: `Cancelamento Grátis até ${cutoff14Str}`,
      badgeClass: "bg-[#0F5257]/10 text-[#0F5257] border-[#0F5257]/20",
      shortSummary: `Cancelamento gratuito até 14 dias antes do check-in (${cutoff14Str}).`,
      details: `Política Hóspede Club: Cancelamento gratuito com reembolso de 100% até 14 dias antes do check-in (${cutoff14Str}). Entre 13 dias e 01 dia antes (${cutoff1Str}), retenção de 50%. No mesmo dia do check-in ou no-show, retenção de 100%.`,
      freeCancellationUntilDate: cutoff14Str,
      cutoffDate14Days: cutoff14Str,
      cutoffDate1Day: cutoff1Str,
      penaltyPercentage: 0,
    };
  }

  // Se estiver entre 2 e 13 dias antes do check-in: 50% de retenção
  return {
    isNonRefundable: false,
    policyType: "HOSPEDE_CLUB_DEFAULT",
    label: `Cancelamento com 50% até ${cutoff1Str}`,
    badgeClass: "bg-[#B8863B]/10 text-[#9A6D28] border-[#B8863B]/20",
    shortSummary: `Cancelamento com 50% de retenção até 01 dia antes (${cutoff1Str}).`,
    details: `Política Hóspede Club: O prazo de cancelamento gratuito (14 dias) expirou. Cancelamento com reembolso de 50% do valor total permitido até 01 dia antes do check-in (${cutoff1Str}). No mesmo dia do check-in ou no-show, retenção integral de 100%.`,
    cutoffDate14Days: cutoff14Str,
    cutoffDate1Day: cutoff1Str,
    penaltyPercentage: 50,
  };
}
