export type VoucherSupplier = { name: string; vatNumber: string };

export function readVoucherSupplier(booking: any): VoucherSupplier | undefined {
  for (const value of [booking?.hotel?.supplier, booking?.supplier]) {
    if (typeof value?.name === "string" && value.name.trim() && typeof value?.vatNumber === "string" && value.vatNumber.trim()) {
      return { name: value.name.trim(), vatNumber: value.vatNumber.trim() };
    }
  }
}

export function supplierVoucherNotice(supplier: VoucherSupplier, reference: string) {
  return `Payable through ${supplier.name}, acting as agent for the service operating company, details of which can be provided upon request. VAT: ${supplier.vatNumber} Reference: ${reference}`;
}

export function voucherCategory(value?: string) {
  if (!value) return "";
  return value.replace(/\b(\d)\s*STARS?\b/gi, "$1 estrelas")
    .replace(/\bLUXURY\b/gi, "luxo").replace(/\bSUPERIOR\b/gi, "superior");
}

export function voucherBoard(value?: string) {
  if (!value) return "";
  const names: Record<string, string> = {
    "BED AND BREAKFAST": "Café da manhã", "BED & BREAKFAST": "Café da manhã", BB: "Café da manhã",
    "ROOM ONLY": "Somente hospedagem", RO: "Somente hospedagem",
    "HALF BOARD": "Meia pensão", HB: "Meia pensão", "FULL BOARD": "Pensão completa", FB: "Pensão completa",
    "ALL INCLUSIVE": "Tudo incluído", AI: "Tudo incluído", "SELF CATERING": "Sem refeições, com cozinha", SC: "Sem refeições, com cozinha",
  };
  return names[value.trim().toUpperCase()] || value;
}

export function voucherComments(value: string) {
  const translations: [RegExp, string][] = [
    [/Estimated total amount of taxes & fees for this booking:/gi, "Valor total estimado de impostos e taxas desta reserva:"],
    [/Brazilian Real payable on arrival/gi, "reais brasileiros, a pagar na chegada"],
    [/Car park YES/gi, "Estacionamento disponível"],
    [/Car park NO/gi, "Estacionamento indisponível"],
    [/\(with additional debit notes\)/gi, "(com cobrança adicional)"],
    [/Per unit\/night/gi, "por unidade/noite"],
    [/Key Collection/gi, "Entrega das chaves"],
    [/Check-in hour/gi, "Horário de entrada"],
    [/Check-out hour/gi, "Horário de saída"],
    [/Charges for late arrival\./gi, "Cobranças por chegada tardia."],
    [/Children share the bed with parents\./gi, "As crianças compartilham a cama com os pais."],
    [/Following the Statute of Children and Adolescents \(Law N[^)]*8\.069\/90\), the accommodation of people under 18 unaccompanied or with their guardians will be accepted only with written authorization of their parents on a notarized document\./gi,
      "Conforme o Estatuto da Criança e do Adolescente (Lei nº 8.069/90), a hospedagem de menores de 18 anos desacompanhados ou com seus responsáveis será aceita somente com autorização escrita dos pais em documento com firma reconhecida."],
    [/Parenthood must be proved through ID or Birth Certificate\./gi,
      "A filiação deve ser comprovada por documento de identidade ou certidão de nascimento."],
  ];
  return translations.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
