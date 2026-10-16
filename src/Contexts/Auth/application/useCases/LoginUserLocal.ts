import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import {
  buildLogger,
  type EncrypterTool
} from '../../../shared/plugins/index.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import type { LoginUserRequest } from '../interfaces/index.js';

const logger = buildLogger('loginUser');
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';

export type LoginUserLocalDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
};

export class LoginUserLocal {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;

  constructor({ authRepository, encrypter }: LoginUserLocalDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
  }

  async run({ email, password }: LoginUserRequest): Promise<string> {
    const storedUser = await this.authRepository.search(email);
    const localPassword = storedUser?.password;
    // Every path pays one bcrypt comparison, so a missing account or one
    // without a password takes as long as a wrong password.
    if (!storedUser || !localPassword) {
      this.encrypter.simulateCompare(password);
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const success = this.encrypter.compare(password, localPassword.value);
    if (!success) {
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // After the password check, so an unvalidated account costs and answers
    // the same as a wrong password.
    if (!storedUser.canStartSession()) {
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = await this.encrypter.generateToken({
      id: storedUser.id,
      email: storedUser.email.value,
      username: storedUser.username.value,
      roles: storedUser.roles.value
    });

    if (!token) {
      throw new DomainUnauthorizedException(TOKEN_GENERATION_ERROR_MESSAGE);
    }

    logger.info(`User <${storedUser.username.value}> logged in`);
    return token;
  }
}
