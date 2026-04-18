import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { Nullable } from '../domain/types/Nullable.js';
import type { EncrypterTool } from './EncrypterTool.js';

const JWT_SECRET = envs.JWT_SECRET;
const SALT_ROUNDS = envs.BCRYPT_SALT_ROUNDS;
const DEFAULT_TOKEN_DURATION = envs.JWT_DEFAULT_DURATION;
const { sign, verify } = jwt;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export class CryptAdapter implements EncrypterTool {
  hash(password: string): string {
    const salt = genSaltSync(SALT_ROUNDS);
    return hashSync(password, salt);
  }

  compare(password: string, hash: string): boolean {
    return compareSync(password, hash);
  }

  async generateToken(
    payload: Record<string, unknown>,
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

  async verifyToken(token: string): Promise<Nullable<Record<string, unknown>>> {
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
