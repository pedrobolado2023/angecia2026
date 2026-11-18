// Os campos de trial permanecem apenas para compatibilidade com cadastros antigos.
// A conta de membro é gratuita, sem vencimento, cobrança ou renovação automática.
export function freeMembership(createdAt = new Date().toISOString()) {
  return { status: "MEMBER" as const, trialStartedAt: createdAt, trialExpiresAt: createdAt, daysRemaining: 0 };
}
