import type { Currency } from './currency';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function groupThousands(value: string, separator: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatMoneyInput(value: string | number | null | undefined, currency: Currency) {
  const raw = String(value ?? '');
  const digits = digitsOnly(raw);
  if (!digits) return '';
  if (currency === 'PYG') return groupThousands(digits.replace(/^0+(?=\d)/, ''), '.');
  const padded = digits.padStart(3, '0');
  const integer = padded.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimals = padded.slice(-2);
  const separator = currency === 'BRL' ? '.' : ',';
  const decimalSeparator = currency === 'BRL' ? ',' : '.';
  return `${groupThousands(integer, separator)}${decimalSeparator}${decimals}`;
}

export function parseMoneyInput(value: string | number | null | undefined, currency: Currency) {
  const raw = String(value ?? '').trim();
  if (!raw) return '0.00';
  const digits = digitsOnly(raw);
  if (!digits) return '0.00';
  if (currency === 'PYG') return String(Number(digits));
  return (Number(digits) / 100).toFixed(2);
}

export function advancePlaceholder(currency: Currency) {
  if (currency === 'PYG') return '0';
  return currency === 'BRL' ? '0,00' : '0.00';
}
