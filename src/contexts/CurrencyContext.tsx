import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'BRL' | 'EUR' | 'USD';

interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
}

export const currencies: CurrencyInfo[] = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'es-ES' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
  getCurrencyInfo: () => CurrencyInfo;
}

const CURRENCY_KEY = 'app_currency';

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved && ['BRL', 'EUR', 'USD'].includes(saved)) {
      return saved as Currency;
    }
    return 'EUR';
  });

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
  };

  const getCurrencyInfo = (): CurrencyInfo => {
    return currencies.find(c => c.code === currency) || currencies[1];
  };

  const formatCurrency = (value: number): string => {
    const info = getCurrencyInfo();
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, getCurrencyInfo }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
