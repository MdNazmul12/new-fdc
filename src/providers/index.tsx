'use client';

import React from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { StoreProvider } from '../contexts/store-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StoreProvider>
        {children}
      </StoreProvider>
    </AuthProvider>
  );
}
