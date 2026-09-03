import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { CURRENCY_OPTIONS, setCurrentCurrency, type Currency } from './currency';
import { trpc } from './trpc';
import { useAuth } from '@/hooks/use-auth';

type CurrencyContextValue = { currency: Currency; setCurrency: (currency: Currency) => void };
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>('BRL');
  const globalCurrencyQuery = trpc.settings.globalCurrency.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
  const setGlobalCurrency = trpc.settings.setGlobalCurrency.useMutation();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';

  useEffect(() => {
    const saved = globalCurrencyQuery.data?.currency;
    if (saved === 'BRL' || saved === 'USD' || saved === 'PYG') {
      setCurrentCurrency(saved);
      setCurrencyState(saved);
    }
  }, [globalCurrencyQuery.data?.currency]);

  const setCurrency = (next: Currency) => {
    if (!isAdmin) return;
    const previous = currency;
    setCurrentCurrency(next);
    setCurrencyState(next);
    setGlobalCurrency.mutate({ currency: next }, {
      onError: (error) => {
        setCurrentCurrency(previous);
        setCurrencyState(previous);
        Alert.alert('Moeda global', error.message || 'Não foi possível salvar a moeda.');
      },
    });
  };

  return <CurrencyContext.Provider key={currency} value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider');
  return { ...context, options: CURRENCY_OPTIONS };
}
