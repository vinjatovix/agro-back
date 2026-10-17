import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { EncrypterTool } from '../../../shared/plugins/index.js';
import type { User } from '../../domain/entities/User.js';

const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';

export type SessionTokenIssuerDependencies = {
  encrypter: EncrypterTool;
};

/**
 * Mints the session token every sign-in shares — a password, Google or GitHub
 * login all get the same signed token (same key, lifetime and identity claims).
 */
export class SessionTokenIssuer {
  private readonly encrypter: EncrypterTool;

  constructor({ encrypter }: SessionTokenIssuerDependencies) {
    this.encrypter = encrypter;
  }

  async issue(user: User): Promise<string> {
    const token = await this.encrypter.generateToken({
      id: user.id,
      email: user.email.value,
      username: user.username.value,
      roles: user.roles.value
    });

    if (!token) {
      throw new DomainUnauthorizedException(TOKEN_GENERATION_ERROR_MESSAGE);
    }

    return token;
  }
}
