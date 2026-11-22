import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { HorizonOsEngine } from './osStore.ts';
import { isRtlLocale, translate } from './l10n.ts';

interface StoreContextValue {
  store: HorizonOsEngine;
  t: (key: string) => string;
  isRtl: boolean;
  refresh: () => void;
}

const HorizonStoreContext = createContext<StoreContextValue | null>(null);

export const HorizonStoreProvider: React.FC<{
  engine?: HorizonOsEngine;
  children: React.ReactNode;
}> = ({ engine, children }) => {
  const [store] = React.useState(() => engine ?? new HorizonOsEngine());
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    return store.subscribe(() => {
      forceUpdate();
    });
  }, [store]);

  const value: StoreContextValue = {
    store,
    t: (key: string) => translate(store.locale, key),
    isRtl: isRtlLocale(store.locale),
    refresh: () => store.notify(),
  };

  return <HorizonStoreContext.Provider value={value}>{children}</HorizonStoreContext.Provider>;
};

export function useHorizonStore(): StoreContextValue {
  const ctx = useContext(HorizonStoreContext);
  if (!ctx) {
    throw new Error('useHorizonStore must be used inside HorizonStoreProvider');
  }
  return ctx;
}
