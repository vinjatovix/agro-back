import { randomBytes } from 'node:crypto';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { Nullable } from '../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../shared/domain/types/UnknownRecord.js';
import { isRecord } from '../../../shared/domain/utils/isRecord.js';
import type { EncrypterTool } from './EncrypterTool.js';

const JWT_SECRET = envs.JWT_SECRET;
const SALT_ROUNDS = envs.BCRYPT_SALT_ROUNDS;
const DEFAULT_TOKEN_DURATION = envs.JWT_DEFAULT_DURATION;
const { sign, verify } = jwt;

/**
 * Built on first use with the configured cost; nobody knows its value. Kept as
 * a promise so concurrent first calls share one hash.
 */
let unusableHash: Promise<string> | undefined;

export class EncrypterAdapter implements EncrypterTool {
  async hash(password: string): Promise<string> {
    return bcryptHash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcryptCompare(password, hash);
  }

  async simulateCompare(password: string): Promise<void> {
    unusableHash ??= this.hash(randomBytes(32).toString('base64url'));
    await bcryptCompare(password, await unusableHash);
  }

  async generateToken(
    payload: UnknownRecord,
    duration: string = DEFAULT_TOKEN_DURATION
  ): Promise<Nullable<string>> {
    return new Promise((resolve) => {
      sign(
        payload,
        JWT_SECRET,
        { expiresIn: duration } as SignOptions,
        (err, token) => (err ? resolve(null) : resolve(token as string))
      );
    });
  }

  async verifyToken(token: string): Promise<Nullable<UnknownRecord>> {
    return new Promise((resolve) => {
      verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !isRecord(decoded)) {
          resolve(null);
          return;
        }

        resolve(decoded);
      });
    });
  }

  async refreshToken(token: string): Promise<Nullable<string>> {
    const decoded = await this.verifyToken(token);
    if (!decoded) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp;
    if (typeof exp !== 'number') {
      return null;
    }

    const payload = { ...decoded };
    delete payload.exp;
    delete payload.iat;

    return exp > now ? this.generateToken(payload) : null;
  }
}
