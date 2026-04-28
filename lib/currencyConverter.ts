// Currency converter utility - prices are stored in RWF in the backend
// This helper converts and displays prices in user's preferred currency
import { getCurrencyPreference as _getCurrencyPreference, type CurrencyCode } from './currencyPreference';

// Re-export for convenience
export { type CurrencyCode };
export const getCurrencyPreference = _getCurrencyPreference;

// Exchange rates (base: RWF)
// These are approximate rates - in production, you might want to fetch these from an API
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  RWF: 1,
  USD: 0.00077,  // ~1300 RWF = 1 USD
  EUR: 0.00071,  // ~1400 RWF = 1 EUR
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  RWF: 'FRW',
  USD: '$',
  EUR: '€',
};

// Format number with thousand separators
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Convert price from one currency to another
 * @param amount - Amount in source currency
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  
  // Convert to RWF first (base currency), then to target
  const amountInRWF = amount / EXCHANGE_RATES[from];
  const convertedAmount = amountInRWF * EXCHANGE_RATES[to];
  
  return Math.round(convertedAmount);
}

/**
 * Format price with currency symbol
 * @param amount - Amount (assumed to be in RWF if fromCurrency not specified)
 * @param fromCurrency - Original currency of the amount
 * @param toCurrency - Target currency to display (defaults to user's preference)
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  fromCurrency: CurrencyCode = 'RWF',
  toCurrency?: CurrencyCode
): string {
  const targetCurrency = toCurrency || getCurrencyPreference();
  const convertedAmount = convertCurrency(amount, fromCurrency, targetCurrency);
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  // For USD and EUR, show symbol before amount
  if (targetCurrency === 'USD' || targetCurrency === 'EUR') {
    return `${symbol}${formatNumber(convertedAmount)}`;
  }
  
  // For RWF and others, show symbol after amount
  return `${formatNumber(convertedAmount)} ${symbol}`;
}

/**
 * Get formatted price with current user currency preference
 * Use this for displaying prices throughout the app
 * @param amountInRWF - Amount in Rwandan Francs (backend stores prices in RWF)
 * @returns Formatted price string
 */
export function displayPrice(amountInRWF: number): string {
  return formatPrice(amountInRWF, 'RWF');
}

/**
 * Parse price from string/number to RWF for storage
 * @param value - Price value
 * @param currency - Currency of the value
 * @returns Amount in RWF
 */
export function parsePriceToRWF(
  value: string | number,
  currency: CurrencyCode = 'RWF'
): number {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue)) return 0;
  
  if (currency === 'RWF') return Math.round(numValue);
  
  // Convert to RWF
  const amountInRWF = numValue / EXCHANGE_RATES[currency];
  return Math.round(amountInRWF);
}

/**
 * Get price filters based on current currency
 * Filters are stored in RWF (base currency) and converted dynamically
 */
const BASE_PRICE_FILTERS_RWF = [
  { id: 'under_500k', label: 'Under 500K', minRWF: 0, maxRWF: 500000 },         // 0 - 500K RWF (~$385)
  { id: '500k_2m', label: '500K - 2M', minRWF: 500000, maxRWF: 2000000 },       // 500K - 2M RWF (~$385-$1.5k)
  { id: '2m_5m', label: '2M - 5M', minRWF: 2000000, maxRWF: 5000000 },           // 2M - 5M RWF (~$1.5k-$3.8k)
  { id: '5m_10m', label: '5M - 10M', minRWF: 5000000, maxRWF: 10000000 },        // 5M - 10M RWF (~$3.8k-$7.7k)
  { id: '10m_20m', label: '10M - 20M', minRWF: 10000000, maxRWF: 19500000 },     // 10M - 20M RWF (~$7.7k-$15k)
  { id: 'under_15k', label: 'Under $15k', minRWF: 0, maxRWF: 19500000 },         // 0 - ~15k USD (legacy)
  { id: '15k_30k', label: '$15k - $30k', minRWF: 19500000, maxRWF: 39000000 },    // ~15k - ~30k USD
  { id: '30k_50k', label: '$30k - $50k', minRWF: 39000000, maxRWF: 65000000 },    // ~30k - ~50k USD
  { id: '50k_plus', label: '$50k+', minRWF: 65000000, maxRWF: Number.POSITIVE_INFINITY }, // ~50k+
] as const;

export function getPriceFilters(currency?: CurrencyCode) {
  const targetCurrency = currency || getCurrencyPreference();
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  return BASE_PRICE_FILTERS_RWF.map((filter) => {
    const min = convertCurrency(filter.minRWF, 'RWF', targetCurrency);
    const max = filter.maxRWF === Number.POSITIVE_INFINITY 
      ? Number.POSITIVE_INFINITY 
      : convertCurrency(filter.maxRWF, 'RWF', targetCurrency);
    
    // Generate appropriate label based on currency and filter type
    // Use FULL DIGITS with thousand separators (e.g., 500,000 instead of 500K)
    let label: string;
    if (filter.id === 'under_500k' || filter.id === 'under_15k') {
      // Under X format
      const maxDisplay = filter.maxRWF.toLocaleString('en-US');
      label = targetCurrency === 'RWF' 
        ? `Under ${maxDisplay} ${symbol}`
        : `Under ${symbol}${max.toLocaleString('en-US')}`;
    } else if (filter.id === '50k_plus') {
      // X+ format
      const minDisplay = filter.minRWF.toLocaleString('en-US');
      label = targetCurrency === 'RWF'
        ? `${minDisplay} ${symbol}+`
        : `${symbol}${min.toLocaleString('en-US')}+`;
    } else {
      // X - Y format for ranges
      const minDisplay = filter.minRWF.toLocaleString('en-US');
      const maxDisplay = filter.maxRWF.toLocaleString('en-US');
      label = targetCurrency === 'RWF'
        ? `${minDisplay} - ${maxDisplay} ${symbol}`
        : `${symbol}${min.toLocaleString('en-US')} - ${symbol}${max.toLocaleString('en-US')}`;
    }
    
    return {
      id: filter.id,
      label,
      min,
      max,
      // Include raw RWF values for comparing against database prices
      rawRWFMin: filter.minRWF,
      rawRWFMax: filter.maxRWF,
    };
  });
}

/**
 * Format a price value for display in filter UI (compact format)
 * This formats values that are ALREADY in RWF (backend storage format)
 * For display ONLY - does NOT convert currency
 */
export function formatFilterPrice(value: number, currency?: CurrencyCode): string {
  const targetCurrency = currency || getCurrencyPreference();
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  // For RWF, show FULL DIGITS with thousand separators (e.g., 4,000,000 FRW)
  if (targetCurrency === 'RWF') {
    return `${value.toLocaleString('en-US')} ${symbol}`;
  }
  
  // For USD/EUR, convert from RWF for display with full digits
  const converted = convertCurrency(value, 'RWF', targetCurrency);
  return `${symbol}${converted.toLocaleString('en-US')}`;
}

/**
 * Format a slider value for display (value is already in target currency)
 * Use this for range slider min/max displays
 */
export function formatSliderValue(value: number, currency?: CurrencyCode): string {
  const targetCurrency = currency || getCurrencyPreference();
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  // Show FULL DIGITS with thousand separators
  if (targetCurrency === 'RWF') {
    return `${value.toLocaleString('en-US')} ${symbol}`;
  }
  
  // For USD/EUR
  return `${symbol}${value.toLocaleString('en-US')}`;
}

/**
 * Get current currency symbol
 */
export function getCurrentCurrencySymbol(): string {
  return CURRENCY_SYMBOLS[getCurrencyPreference()];
}

/**
 * Get all available currencies info
 */
export function getCurrenciesInfo() {
  return [
    { code: 'RWF' as const, name: 'Rwandan Franc', symbol: 'FRW', flag: '🇷🇼' },
    { code: 'USD' as const, name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR' as const, name: 'Euro', symbol: '€', flag: '🇪🇺' },
  ];
}

/**
 * Update exchange rates (call this periodically or on app start)
 * In production, fetch from an API like openexchangerates.org
 */
export async function updateExchangeRates(): Promise<void> {
  // TODO: Implement API fetch for live rates
  // For now, using static rates
  console.log('Exchange rates update not implemented - using static rates');
}
