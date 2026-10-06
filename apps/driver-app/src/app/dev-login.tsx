import { devLogin, Loading, useSession } from '@tawreed/mobile';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

/** __DEV__-only automation entry: exp://…/--/dev-login?phone=05…&next=/cart */
export default function DevLogin() {
  const { phone, next } = useLocalSearchParams<{ phone?: string; next?: string }>();
  const { reload } = useSession();
  useEffect(() => {
    if (!__DEV__ || !phone) {
      router.replace('/');
      return;
    }
    void devLogin(phone).then(async () => {
      await reload();
      router.replace((next ?? '/') as never);
    });
  }, [phone, next, reload]);
  return <Loading />;
}
