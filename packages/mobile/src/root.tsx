import type { MeResponse } from '@tawreed/contracts';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from './api/session';
import { ToastProvider } from './components/toast';
import { I18nProvider } from './i18n';
import { useTawreedFonts } from './theme/fonts';

void SplashScreen.preventAutoHideAsync();

function HideSplashWhenReady({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);
  return status === 'loading' ? null : children;
}

/** Everything an app needs above its router: fonts, locale/RTL, session, query client, toasts. */
export function TawreedRoot({ children, expect, statusBar = 'dark' }: { children: React.ReactNode; expect: MeResponse['context']['type']; statusBar?: 'dark' | 'light' }) {
  const fontsReady = useTawreedFonts();
  if (!fontsReady) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <SessionProvider expect={expect}>
            <ToastProvider>
              <StatusBar style={statusBar} />
              <HideSplashWhenReady>{children}</HideSplashWhenReady>
            </ToastProvider>
          </SessionProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
