import type { AuthResult, OtpRequestResult } from '@tawreed/contracts';
import { acceptAuthResult, api } from '../api/client';
import { appClient } from '../config';

/**
 * Development only (__DEV__): signs in through the normal OTP endpoints using the code the *dev* API
 * returns in `devCode`. Used by simulator automation (deep link …/dev-login?phone=05…). Never available
 * in release builds, and it only works against an API running with APP_ENV=development.
 */
export async function devLogin(phone: string): Promise<boolean> {
  if (!__DEV__) return false;
  const r = await api.post<OtpRequestResult>('/auth/otp/request', { phone, app: appClient() });
  if (!r.devCode) return false;
  const result = await api.post<AuthResult>('/auth/otp/verify', { phone, code: r.devCode, app: appClient() });
  await acceptAuthResult(result);
  return result.status === 'AUTHENTICATED';
}
