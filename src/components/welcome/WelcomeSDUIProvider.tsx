'use client';

import { useSearchParams } from 'next/navigation';
import { useSDUI } from '@/hooks/sdui';

interface WelcomeSDUIProviderProps {
  children: React.ReactNode;
  locale: string;
}

export function WelcomeSDUIProvider({ children, locale }: WelcomeSDUIProviderProps) {
  const searchParams = useSearchParams();
  const previewToken = searchParams.get('preview');

  const { isSectionVisible } = useSDUI({
    page: 'welcome',
    userRole: 'guest',
    previewToken,
  });

  return (
    <WelcomeSDUIContext.Provider value={{ isSectionVisible }}>
      {children}
    </WelcomeSDUIContext.Provider>
  );
}

// Context for SDUI visibility
import { createContext, useContext } from 'react';

interface WelcomeSDUIContextType {
  isSectionVisible: (sectionKey: string) => boolean;
}

const WelcomeSDUIContext = createContext<WelcomeSDUIContextType>({
  isSectionVisible: () => true,
});

export function useWelcomeSDUI() {
  return useContext(WelcomeSDUIContext);
}

// Section wrapper component
interface SDUISectionProps {
  sectionKey: string;
  children: React.ReactNode;
}

export function SDUISection({ sectionKey, children }: SDUISectionProps) {
  const { isSectionVisible } = useWelcomeSDUI();

  if (!isSectionVisible(sectionKey)) {
    return null;
  }

  return <>{children}</>;
}
