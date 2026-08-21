import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CURRENCY_OPTIONS, loadCurrency, persistCurrency, setCurrentCurrency, type Currency } from './currency';

type CurrencyContextValue = { currency: Currency; setCurrency: (currency: Currency) => void };
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('BRL');
  useEffect(() => { loadCurrency().then((saved) => { setCurrentCurrency(saved); setCurrencyState(saved); }); }, []);
  const setCurrency = (next: Currency) => { setCurrentCurrency(next); setCurrencyState(next); persistCurrency(next); };
  return <CurrencyContext.Provider key={currency} value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider');
  return { ...context, options: CURRENCY_OPTIONS };
}
