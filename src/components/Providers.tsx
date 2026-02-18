'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/Toast';
import { WebSocketProvider } from '@/lib/ws';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <ToastProvider>{children}</ToastProvider>
      </WebSocketProvider>
    </SessionProvider>
  );
}
