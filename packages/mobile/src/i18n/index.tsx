import { ar as sharedAr, en as sharedEn } from '@tawreed/i18n';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { IntlProvider } from 'use-intl';
import arMessages from '../messages/ar.json';
import enMessages from '../messages/en.json';

export type Locale = 'ar' | 'en';
const KEY = 'tw_locale';

const catalogs = {
  ar: { ...arMessages, enums: sharedAr.enums, errors: sharedAr.errors },
  en: { ...enMessages, enums: sharedEn.enums, errors: sharedEn.errors },
};

interface LocaleCtx {
  locale: Locale;
  rtl: boolean;
  setLocale: (l: Locale) => Promise<void>;
}
const Ctx = createContext<LocaleCtx>({ locale: 'ar', rtl: true, setLocale: () => Promise.resolve() });
export const useLocale = () => useContext(Ctx);
/** Layout direction of the current language (use instead of I18nManager.isRTL). */
export const useRTL = () => useContext(Ctx).rtl;

/**
 * Locale + layout direction. Direction is applied with Yoga's `direction` style on the root view
 * rather than I18nManager.forceRTL: it works the same in Expo Go and native builds and switches
 * instantly without an app reload. Default is Arabic (Saudi-first); the choice is persisted.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);
  useEffect(() => {
    void SecureStore.getItemAsync(KEY).then((saved) => setLocaleState(saved === 'en' ? 'en' : 'ar'));
  }, []);
  if (!locale) return null;
  const rtl = locale === 'ar';
  const setLocale = async (l: Locale) => {
    await SecureStore.setItemAsync(KEY, l);
    setLocaleState(l);
  };
  return (
    <Ctx.Provider value={{ locale, rtl, setLocale }}>
      <IntlProvider locale={locale} messages={catalogs[locale]} timeZone="Asia/Riyadh" onError={() => undefined}>
        <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>{children}</View>
      </IntlProvider>
    </Ctx.Provider>
  );
}

export { useFormatter, useTranslations } from 'use-intl';
