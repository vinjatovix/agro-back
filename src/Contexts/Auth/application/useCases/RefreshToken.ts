import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { EncrypterTool } from '../../../shared/plugins/EncrypterTool.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';

const INVALID_TOKEN_MESSAGE = 'Invalid token';

export type RefreshTokenRequest = {
  token: string;
  /** Id of the user the verified session belongs to. */
  userId: string;
};

export type RefreshTokenDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
  emailValidationRequired: boolean;
};

export class RefreshToken {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;
  private readonly emailValidationRequired: boolean;

  constructor({
    authRepository,
    encrypter,
    emailValidationRequired
  }: RefreshTokenDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
    this.emailValidationRequired = emailValidationRequired;
  }

  /** A removed or unvalidated account gets the same answer as a bad token. */
  async run({ token, userId }: RefreshTokenRequest): Promise<string> {
    const user = await this.authRepository.searchById(userId);
    if (!user?.canStartSession(this.emailValidationRequired)) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const newToken = await this.encrypter.refreshToken(token);
    if (!newToken) {
      throw new DomainUnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return newToken;
  }
}
