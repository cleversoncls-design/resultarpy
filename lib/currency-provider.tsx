import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CURRENCY_OPTIONS, setCurrentCurrency, type Currency } from './currency';
import { trpc } from './trpc';
import { useAuth } from '@/hooks/use-auth';

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  error: string | null;
  isSaving: boolean;
};
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>('BRL');
  // Antes usava Alert.alert() para avisar de um erro ao trocar a moeda —
  // isso não funciona na web, então qualquer falha ficava invisível
  // (parecia que "não deixava trocar", sem explicação nenhuma). Agora o
  // erro fica disponível aqui para quem consome o contexto exibir.
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    if (!isAdmin) {
      setError('Somente o Administrativo pode alterar a moeda global.');
      return;
    }
    const previous = currency;
    setCurrentCurrency(next);
    setCurrencyState(next);
    setGlobalCurrency.mutate({ currency: next }, {
      onError: (mutationError) => {
        setCurrentCurrency(previous);
        setCurrencyState(previous);
        setError(mutationError.message || 'Não foi possível salvar a moeda.');
      },
      onSuccess: () => setError(null),
    });
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, error, isSaving: setGlobalCurrency.isPending }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider');
  return { ...context, options: CURRENCY_OPTIONS };
}
