import React from 'react';
import { HorizonStoreProvider, useHorizonStore } from './core/StoreContext.tsx';
import { LoginScreen, SplashScreen } from './features/AuthScreens.tsx';
import { ResponsiveShell } from './components/ResponsiveShell.tsx';

const HorizonRouter: React.FC = () => {
  const { store } = useHorizonStore();

  if (!store.splashComplete) {
    return <SplashScreen />;
  }

  if (!store.authenticated) {
    return <LoginScreen />;
  }

  return <ResponsiveShell />;
};

export const App: React.FC = () => {
  return (
    <HorizonStoreProvider>
      <HorizonRouter />
    </HorizonStoreProvider>
  );
};

export default App;
