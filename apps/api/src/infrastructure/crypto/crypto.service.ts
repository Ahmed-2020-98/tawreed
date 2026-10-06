import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class CryptoService {
  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  hmac(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  }

  /** URL-safe random token (default 256-bit). */
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  numericCode(length = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) code += randomInt(0, 10).toString();
    return code;
  }

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password).catch(() => false);
  }
}
