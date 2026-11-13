/**
 * HÓSPEDE CLUB — Motor de Conversão Cambial em Tempo Real
 *
 * A API da Hotelbeds (APItude) opera por padrão em EUR (Euros) ou USD (Dólares)
 * conforme o contrato comercial da agência.
 *
 * Este módulo:
 * 1. Consulta cotações oficiais ao vivo (Banco Central / AwesomeAPI)
 * 2. Mantém cache inteligente de 30 minutos em memória
 * 3. Garante fallbacks de segurança contra oscilações de rede
 * 4. Converte tarifas líquidas (Net Rates) de EUR/USD para BRL (Reais) antes do cálculo de markup
 */

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>;
}

// Fallbacks de segurança caso o serviço de cotações esteja fora do ar
const FALLBACK_RATES: Record<string, number> = {
  BRL: 1.0,
  EUR: 6.25,
  USD: 5.65,
  GBP: 7.45,
};

let cachedExchangeRates: CachedRates = {
  timestamp: 0,
  rates: { ...FALLBACK_RATES },
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Obtém as cotações de moedas atualizadas em tempo real para BRL
 */
export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - cachedExchangeRates.timestamp < CACHE_TTL_MS && Object.keys(cachedExchangeRates.rates).length > 1) {
    return cachedExchangeRates.rates;
  }

  try {
    const res = await fetch("https://economia.awesomeapi.com.br/last/EUR-BRL,USD-BRL,GBP-BRL", {
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const data = await res.json();
      const eur = Number(data.EURBRL?.bid || data.EURBRL?.ask || FALLBACK_RATES.EUR);
      const usd = Number(data.USDBRL?.bid || data.USDBRL?.ask || FALLBACK_RATES.USD);
      const gbp = Number(data.GBPBRL?.bid || data.GBPBRL?.ask || FALLBACK_RATES.GBP);

      cachedExchangeRates = {
        timestamp: now,
        rates: {
          BRL: 1.0,
          EUR: eur > 0 ? eur : FALLBACK_RATES.EUR,
          USD: usd > 0 ? usd : FALLBACK_RATES.USD,
          GBP: gbp > 0 ? gbp : FALLBACK_RATES.GBP,
        },
      };

      console.log(
        `[CÂMBIO AO VIVO] Cotações atualizadas: EUR=R$ ${cachedExchangeRates.rates.EUR.toFixed(2)}, USD=R$ ${cachedExchangeRates.rates.USD.toFixed(2)}`
      );
      return cachedExchangeRates.rates;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[CÂMBIO] Falha ao consultar API de câmbio, usando cotações de contingência:", msg);
  }

  return cachedExchangeRates.rates;
}

/**
 * Retorna o multiplicador de conversão para BRL de uma determinada moeda
 */
export async function getExchangeRateToBRL(fromCurrency: string): Promise<number> {
  const upper = (fromCurrency || "BRL").trim().toUpperCase();
  if (upper === "BRL") return 1.0;

  const rates = await fetchLiveExchangeRates();
  return rates[upper] || FALLBACK_RATES[upper] || 1.0;
}

/**
 * Versão síncrona usando o último valor em cache (ou fallback)
 */
export function getSyncExchangeRateToBRL(fromCurrency: string): number {
  const upper = (fromCurrency || "BRL").trim().toUpperCase();
  if (upper === "BRL") return 1.0;
  return cachedExchangeRates.rates[upper] || FALLBACK_RATES[upper] || 1.0;
}

/**
 * Converte um valor de moeda estrangeira (ex: EUR da Hotelbeds) para BRL
 */
export function convertAmountToBRL(
  amount: number,
  currency: string,
  rateMultiplier?: number
): {
  amountBRL: number;
  rate: number;
  originalAmount: number;
  originalCurrency: string;
} {
  const cleanAmount = Number(amount || 0);
  const upperCurrency = (currency || "BRL").trim().toUpperCase();
  const rate = rateMultiplier !== undefined ? rateMultiplier : getSyncExchangeRateToBRL(upperCurrency);

  const amountBRL = Math.round(cleanAmount * rate * 100) / 100;

  return {
    amountBRL,
    rate,
    originalAmount: cleanAmount,
    originalCurrency: upperCurrency,
  };
}

