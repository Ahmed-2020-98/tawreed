import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** API origin reachable from the device: EXPO_PUBLIC_API_URL, else the dev machine as seen by the simulator/emulator. */
export function apiOrigin(): string {
  const env: string | undefined = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:8030' : 'http://localhost:8030';
}

/** The API builds absolute URLs with localhost; Android emulators reach the host as 10.0.2.2. */
export function deviceUrl<T extends string | null | undefined>(url: T): T {
  if (!url || Platform.OS !== 'android') return url;
  return url.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, (_m, _h, port: string | undefined) => `http://10.0.2.2${port ?? ''}`) as T;
}

export type AppClientName = 'BUYER_APP' | 'SUPPLIER_APP' | 'DRIVER_APP';

export function appClient(): AppClientName {
  return (Constants.expoConfig?.extra?.appClient as AppClientName | undefined) ?? 'BUYER_APP';
}
