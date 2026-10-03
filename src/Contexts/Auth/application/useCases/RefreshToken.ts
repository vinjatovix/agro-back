import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { EncrypterTool } from '../../../shared/plugins/EncrypterTool.js';

export type RefreshTokenDependencies = {
  encrypter: EncrypterTool;
};

export class RefreshToken {
  private readonly encrypter: EncrypterTool;

  constructor({ encrypter }: RefreshTokenDependencies) {
    this.encrypter = encrypter;
  }

  async run(token: string): Promise<string> {
    const newToken = await this.encrypter.refreshToken(token);
    if (!newToken) {
      throw new DomainUnauthorizedException('Invalid token');
    }

    return newToken;
  }
}
