import { upsertCurrencyRates, type CurrencyRateInput } from './catalog-repository';

export const DNIT_CURRENCY_URL = 'https://www.dnit.gov.py/en/web/portal-institucional/cotizaciones';
export const BCP_CURRENCY_URL = 'https://www.bcp.gov.py/webapps/web/cotizacion/monedas';
const ASUNCION_TIME_ZONE = 'America/Asuncion';
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type ParsedRate = { fromCurrency: 'USD' | 'BRL'; rate: string };

function htmlText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

function parseLocalizedNumber(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Cotação inválida: ${value}`);
  return parsed.toFixed(8);
}

function datePartsInAsuncion(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ASUNCION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])) as { year: string; month: string; day: string };
}

export function asuncionDate(date = new Date()) {
  const parts = datePartsInAsuncion(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tableRows(html: string) {
  return [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => [...match[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlText(cell[1])));
}

export function parseDnitMonthlyRates(html: string, targetDate: string): ParsedRate[] {
  const [year, month, day] = targetDate.split('-').map(Number);
  const title = `Tipos de cambios del mes de ${MONTHS[month - 1]} ${year}`;
  const titleIndex = html.toLocaleLowerCase().indexOf(title.toLocaleLowerCase());
  if (titleIndex < 0) throw new Error(`A DNIT não publicou a seção mensal de ${month}/${year}.`);
  const tableEnd = html.indexOf('</table>', titleIndex);
  const table = html.slice(titleIndex, tableEnd > titleIndex ? tableEnd : titleIndex + 500000);
  const rows = tableRows(table);
  const candidates = rows.filter((cells) => /^\d{1,2}$/.test(cells[0] ?? '') && cells.length >= 5).map((cells) => ({ day: Number(cells[0]), usdSale: cells[2], brlSale: cells[4] })).filter((row) => row.day <= day).sort((a, b) => b.day - a.day);
  const row = candidates[0];
  if (!row) throw new Error(`A DNIT não possui cotação disponível para ${targetDate}.`);
  return [{ fromCurrency: 'USD', rate: parseLocalizedNumber(row.usdSale) }, { fromCurrency: 'BRL', rate: parseLocalizedNumber(row.brlSale) }];
}

export function parseBcpDailyRates(html: string): ParsedRate[] {
  const rows = tableRows(html);
  const parsed = new Map<string, string>();
  for (const cells of rows) {
    const code = cells.find((cell) => /^(USD|BRL)$/i.test(cell));
    if (!code || cells.length < 4) continue;
    parsed.set(code.toUpperCase(), parseLocalizedNumber(cells[cells.length - 1]));
  }
  const usd = parsed.get('USD');
  const brl = parsed.get('BRL');
  if (!usd || !brl) throw new Error('O BCP não retornou as cotações de USD e BRL.');
  return [{ fromCurrency: 'USD', rate: usd }, { fromCurrency: 'BRL', rate: brl }];
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Controle-de-Viagens/1.0 (currency-sync)' }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Fonte de cotação indisponível (${response.status}).`);
  return response.text();
}

async function fetchOfficialRates(rateDate: string) {
  try {
    const parsed = parseDnitMonthlyRates(await fetchText(DNIT_CURRENCY_URL), rateDate);
    return { source: 'DNIT' as const, rateType: 'venda' as const, sourceUrl: DNIT_CURRENCY_URL, parsed };
  } catch (dnitError) {
    console.warn(`[currency] DNIT indisponível: ${dnitError instanceof Error ? dnitError.message : String(dnitError)}; usando BCP.`);
    const parsed = parseBcpDailyRates(await fetchText(BCP_CURRENCY_URL));
    return { source: 'BCP' as const, rateType: 'referencial' as const, sourceUrl: BCP_CURRENCY_URL, parsed };
  }
}

export async function syncOfficialCurrencyRates(rateDate = asuncionDate()) {
  const official = await fetchOfficialRates(rateDate);
  const inputs: CurrencyRateInput[] = [{ rateDate, fromCurrency: 'PYG', toCurrency: 'PYG', rate: '1', rateType: official.rateType, source: official.source, sourceUrl: official.sourceUrl }, ...official.parsed.map((item) => ({ rateDate, fromCurrency: item.fromCurrency, toCurrency: 'PYG' as const, rate: item.rate, rateType: official.rateType, source: official.source, sourceUrl: official.sourceUrl }))];
  return upsertCurrencyRates(inputs);
}

let schedulerStarted = false;
let scheduler: ReturnType<typeof setInterval> | undefined;

export function startCurrencyRateScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const run = async () => {
    try {
      const rates = await syncOfficialCurrencyRates();
      console.log(`[currency] cotações atualizadas: ${rates.map((rate) => `${rate.fromCurrency}/${rate.toCurrency}=${rate.rate}`).join(', ')}`);
    } catch (error) {
      console.error(`[currency] falha na atualização diária: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  void run();
  scheduler = setInterval(() => void run(), 24 * 60 * 60 * 1000);
}

export function stopCurrencyRateScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = undefined;
  schedulerStarted = false;
}
