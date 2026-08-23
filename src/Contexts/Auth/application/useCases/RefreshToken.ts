import type { EncrypterTool } from '../../../shared/plugins/EncrypterTool.js';
import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';

export class RefreshToken {
  constructor(private readonly encrypter: EncrypterTool) {}

  async run(token: string): Promise<string> {
    const newToken = await this.encrypter.refreshToken(token);
    if (!newToken) {
      throw new DomainUnauthorizedException('Invalid token');
    }

    return newToken;
  }
}
