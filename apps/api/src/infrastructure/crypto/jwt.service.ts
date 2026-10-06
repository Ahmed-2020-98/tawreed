import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

/** Thin HS256 JWT helper (jose). Secrets are passed per use so tokens of different kinds can't be swapped. */
@Injectable()
export class JwtService {
  private readonly keys = new Map<string, Uint8Array>();

  private key(secret: string): Uint8Array {
    let k = this.keys.get(secret);
    if (!k) {
      k = new TextEncoder().encode(secret);
      this.keys.set(secret, k);
    }
    return k;
  }

  async sign(payload: JWTPayload, secret: string, ttlSeconds: number, audience: string): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer('tawreed')
      .setAudience(audience)
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
      .sign(this.key(secret));
  }

  async verify<T extends JWTPayload>(token: string, secret: string, audience: string): Promise<T | null> {
    try {
      const { payload } = await jwtVerify(token, this.key(secret), { issuer: 'tawreed', audience, algorithms: ['HS256'] });
      return payload as T;
    } catch {
      return null;
    }
  }
}
