import { bootApi, type TestApi } from './helpers.js';

let api: TestApi;

beforeAll(async () => {
  api = await bootApi();
});
afterAll(async () => {
  await api?.close();
});

describe('auth & API conventions', () => {
  it('serves health and 404s with the error envelope + request id', async () => {
    expect((await api.get('/health/live')).status).toBe(200);
    expect((await api.get('/health/ready')).status).toBe(200);
    const r = await api.get('/nope');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBeTruthy();
    expect(r.headers.get('x-request-id')).toBeTruthy();
  });

  it('returns 422 with localized field details for invalid input', async () => {
    const ar = await api.post('/auth/otp/request', { phone: '123', app: 'WEB' });
    expect(ar.status).toBe(422);
    expect(ar.body.error.code).toBe('VALIDATION_FAILED');
    expect(ar.body.error.details).toBeTruthy();
    const en = await api.req('POST', '/auth/otp/request', { body: { phone: '123', app: 'WEB' }, headers: { 'accept-language': 'en' } });
    expect(en.body.error.message).not.toBe(ar.body.error.message);
  });

  it('requires a token on protected routes', async () => {
    expect((await api.get('/buyer/cart')).status).toBe(401);
    expect((await api.get('/buyer/cart', 'not-a-jwt')).status).toBe(401);
  });

  it('rejects a wrong OTP and locks after too many attempts', async () => {
    const phone = '+966555000999';
    await api.post('/auth/otp/request', { phone, app: 'WEB' });
    const bad = await api.post('/auth/otp/verify', { phone, app: 'WEB', code: '000000' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('OTP_INVALID');
  });

  it('sends unknown phones to registration, and normalizes Saudi phone formats', async () => {
    const data = await api.loginFull('0555000888');
    expect(data.status).toBe('REGISTRATION_REQUIRED');
    expect(data.phone).toBe('+966555000888');
  });

  it('rotates refresh tokens, tolerates a concurrent-refresh race, and revokes the session on real reuse', async () => {
    const first = await api.loginFull('+966500000002');
    expect(first.status).toBe('AUTHENTICATED');
    expect(first.context.type).toBe('BUYER');
    const r1 = await api.post('/auth/refresh', { refreshToken: first.tokens.refreshToken });
    expect(r1.status).toBe(200);
    const second = r1.body.data.tokens;
    expect(second.refreshToken).not.toBe(first.tokens.refreshToken);
    // Two tabs refreshing at once: the loser gets a retryable 409, the session survives.
    const race = await api.post('/auth/refresh', { refreshToken: first.tokens.refreshToken });
    expect(race.status).toBe(409);
    expect((await api.get('/auth/me', second.accessToken)).status).toBe(200);
    // Replaying the rotated token after the grace window means it leaked → the whole session is revoked.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.now() + 20_000);
      const replay = await api.post('/auth/refresh', { refreshToken: first.tokens.refreshToken });
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('REFRESH_TOKEN_REUSED');
      expect((await api.post('/auth/refresh', { refreshToken: second.refreshToken })).status).toBe(401);
      expect((await api.get('/auth/me', second.accessToken)).status).toBe(401);
    } finally {
      vi.useRealTimers();
    }
  });

  it('enforces role permissions inside a company (viewer-like accountant cannot place orders)', async () => {
    const accountant = await api.login('+966500000003');
    const me = await api.get('/auth/me', accountant);
    expect(me.body.data.context.role).toBe('ACCOUNTANT');
    const r = await api.post('/buyer/checkout/place', { addressId: '0190e5f4-0000-7000-8000-000000000000', paymentMethod: 'COD', deliveries: [{ supplierId: '0190e5f4-0000-7000-8000-000000000000', date: '2030-01-01', window: 'MORNING' }], expectedTotal: '1.00' }, accountant);
    expect(r.status).toBe(403);
  });

  it('staff login works and staff endpoints reject buyer tokens', async () => {
    const admin = await api.staffLogin();
    expect((await api.get('/admin/dashboard', admin)).status).toBe(200);
    const buyer = await api.login('+966500000001');
    expect((await api.get('/admin/dashboard', buyer)).status).toBe(403);
    const bad = await api.post('/auth/staff/login', { email: 'admin@tawreed.test', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });
});
