import { createError } from '../../../../shared/errors/index.js';
import {
  buildLogger,
  type EncrypterTool
} from '../../../shared/plugins/index.js';
import type { UserRepository } from '../../domain/repositories/interfaces/UserRepository.js';
import type { LoginUserRequest } from '../interfaces/index.js';

const logger = buildLogger('loginUser');
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';

export class LoginUserLocal {
  private readonly repository: UserRepository;
  private readonly encrypter: EncrypterTool;

  constructor(repository: UserRepository, encrypter: EncrypterTool) {
    this.repository = repository;
    this.encrypter = encrypter;
  }

  async run({ email, password }: LoginUserRequest): Promise<string> {
    const storedUser = await this.repository.search(email);
    if (!storedUser) {
      throw createError.auth(INVALID_CREDENTIALS_MESSAGE);
    }

    const localPassword = storedUser.password;
    if (!localPassword) {
      throw createError.auth(INVALID_CREDENTIALS_MESSAGE);
    }

    const success = this.encrypter.compare(password, localPassword.value);
    if (!success) {
      throw createError.auth(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = await this.encrypter.generateToken({
      id: storedUser.id.value,
      email: storedUser.email.value,
      username: storedUser.username.value,
      roles: storedUser.roles.value
    });

    if (!token) {
      throw createError.auth(TOKEN_GENERATION_ERROR_MESSAGE);
    }

    logger.info(`User <${storedUser.username.value}> logged in`);
    return token;
  }
}
