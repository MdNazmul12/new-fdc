'use client';

import React from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { StoreProvider } from '../contexts/store-context';
import { PushNotificationProvider } from '../components/push-notification-manager';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StoreProvider>
        <PushNotificationProvider>
          {children}
        </PushNotificationProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
