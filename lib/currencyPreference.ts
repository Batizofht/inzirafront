import AsyncStorage from '@react-native-async-storage/async-storage';

export const CURRENCIES = ['RWF', 'USD', 'EUR'] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

const CURRENCY_STORAGE_KEY = 'selected_currency';

let selectedCurrency: CurrencyCode = 'RWF';
let isInitialized = false;

export async function initCurrencyPreference(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && (CURRENCIES as readonly string[]).includes(stored)) {
      selectedCurrency = stored as CurrencyCode;
    }
    isInitialized = true;
  } catch (error) {
    console.warn('Failed to load currency preference:', error);
    isInitialized = true;
  }
}

export function getCurrencyPreference(): CurrencyCode {
  return selectedCurrency;
}

export async function setCurrencyPreference(currency: CurrencyCode): Promise<void> {
  selectedCurrency = currency;
  
  try {
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch (error) {
    console.warn('Failed to save currency preference:', error);
  }
}

// For backward compatibility - synchronous set (saves to storage in background)
export function setCurrencyPreferenceSync(currency: CurrencyCode): void {
  selectedCurrency = currency;
  
  // Fire and forget - don't wait for storage
  AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency).catch((error) => {
    console.warn('Failed to save currency preference:', error);
  });
}
