import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'BRL' | 'USD' | 'PYG';

export const CURRENCY_OPTIONS: { key: Currency; label: string; symbol: string; locale: string; decimals: number }[] = [
  { key: 'BRL', label: 'R$ · Reais', symbol: 'R$', locale: 'pt-BR', decimals: 2 },
  { key: 'USD', label: 'US$ · Dólares', symbol: 'US$', locale: 'en-US', decimals: 2 },
  { key: 'PYG', label: 'G$ · Guaranies', symbol: 'G$', locale: 'es-PY', decimals: 0 },
];

export const CURRENCY_KEY = '@controle-viagens/global-currency';
let currentCurrency: Currency = 'BRL';

export function getCurrencyConfig(currency: Currency = currentCurrency) {
  return CURRENCY_OPTIONS.find((option) => option.key === currency) ?? CURRENCY_OPTIONS[0];
}

export function setCurrentCurrency(currency: Currency) {
  currentCurrency = currency;
}

export function getCurrentCurrency() {
  return currentCurrency;
}

export function formatCurrency(value: number, currency: Currency = currentCurrency) {
  const config = getCurrencyConfig(currency);
  if (config.key === 'PYG') return `${config.symbol} ${Math.round(value).toLocaleString(config.locale)}`;
  const formatted = new Intl.NumberFormat(config.locale, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals }).format(value);
  return `${config.symbol} ${formatted}`;
}

export async function loadCurrency(): Promise<Currency> {
  const saved = await AsyncStorage.getItem(CURRENCY_KEY);
  return saved === 'BRL' || saved === 'USD' || saved === 'PYG' ? saved : 'BRL';
}

export async function persistCurrency(currency: Currency) {
  await AsyncStorage.setItem(CURRENCY_KEY, currency);
}
