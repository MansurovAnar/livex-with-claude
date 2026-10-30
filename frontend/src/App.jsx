import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { LanguageProvider } from './i18n/LanguageContext';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SocketProvider>
          <AppRouter />
        </SocketProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
