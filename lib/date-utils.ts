export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatDateDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeDateValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isIsoDate(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? trimmed : null;
  }
  const brazilian = parseBrazilianDate(trimmed);
  if (brazilian) return brazilian;
  const postgresTimestamp = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(trimmed)?.[1];
  return postgresTimestamp && isIsoDate(postgresTimestamp) ? normalizeDateValue(postgresTimestamp) : null;
}

export function parseBrazilianDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

/** Formata uma data (AAAA-MM-DD, timestamp ISO ou Date) como DD/MM/AAAA; devolve o valor original se não reconhecer. */
export function formatDateLoose(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${String(value.getUTCDate()).padStart(2, '0')}/${String(value.getUTCMonth() + 1).padStart(2, '0')}/${value.getUTCFullYear()}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
