import type { UnknownRecord } from '../../../../shared/domain/types/UnknownRecord.js';
import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { EncrypterTool } from '../../../shared/plugins/EncrypterTool.js';
import { buildLogger } from '../../../shared/plugins/logger.plugin.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import { UserPatch } from '../../domain/entities/UserPatch.js';

const logger = buildLogger('validateMail');
const INVALID_TOKEN_MESSAGE = 'Invalid token';

type ValidateMailRequest = {
  token: string;
};

export class ValidateMail {
  private readonly repository: AuthRepository;
  private readonly encrypter: EncrypterTool;

  constructor(repository: AuthRepository, encrypter: EncrypterTool) {
    this.repository = repository;
    this.encrypter = encrypter;
  }

  async run({ token }: ValidateMailRequest): Promise<string> {
    const validToken = await this.encrypter.verifyToken(token);
    if (!validToken) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const email = this.extractEmailFromToken(validToken);

    const storedUser = await this.repository.search(email);
    if (!storedUser) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const userToPatch = UserPatch.fromPrimitives({
      id: storedUser.id.value,
      emailValidated: true
    });

    await this.repository.update(userToPatch, storedUser.username);
    logger.info(`User <${storedUser.username.value}> validated email`);

    const newToken = await this.encrypter.refreshToken(token);
    if (!newToken) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return newToken;
  }

  private extractEmailFromToken(decodedToken: UnknownRecord): string {
    const email = decodedToken['email'];
    if (typeof email !== 'string' || !email) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return email;
  }
}
