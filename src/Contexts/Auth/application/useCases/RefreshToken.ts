import type { EncrypterTool } from '../../../shared/plugins/EncrypterTool.js';
import { createError } from '../../../../shared/errors/index.js';

export class RefreshToken {
  constructor(private readonly encrypter: EncrypterTool) {}

  async run(token: string): Promise<string> {
    const newToken = await this.encrypter.refreshToken(token);
    if (!newToken) {
      throw createError.auth('Invalid token');
    }

    return newToken;
  }
}
