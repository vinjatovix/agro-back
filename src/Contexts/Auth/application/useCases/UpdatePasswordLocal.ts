import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import {
  DomainConflictException,
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../shared/domain/errors/index.js';
import {
  buildLogger,
  type EncrypterTool
} from '../../../shared/plugins/index.js';
import type { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import {
  PasswordHash,
  PlainPassword
} from '../../domain/value-objects/index.js';
import type {
  UpdatePasswordRequest,
  UserSessionInfo
} from '../interfaces/index.js';
import {
  CONCURRENT_CHANGE_MESSAGE,
  PASSWORDS_DO_NOT_MATCH_MESSAGE
} from '../messages.js';

const logger = buildLogger('updatePassword');
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const PASSWORD_MUST_DIFFER_FROM_OLD_MESSAGE =
  'New password must be different from old password';

export type UpdatePasswordLocalDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
};

export class UpdatePasswordLocal {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;

  constructor({ authRepository, encrypter }: UpdatePasswordLocalDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
  }

  async run(
    { password, repeatPassword, oldPassword }: UpdatePasswordRequest,
    user: UserSessionInfo
  ): Promise<void> {
    // Password rule before any lookup: a weak password is always a 400.
    const newPassword = new PlainPassword(password);
    const storedUser = await this.validatePatchAndGetStoredUser(
      { password, repeatPassword, oldPassword },
      user
    );

    const encryptedPassword = new PasswordHash(
      await this.encrypter.hash(newPassword.value)
    );
    const before = storedUser.toPrimitives();
    storedUser.changePassword(encryptedPassword, new Date());

    const outcome = await this.authRepository.update(
      before,
      storedUser.toPrimitives()
    );
    if (outcome === 'stale') {
      throw new DomainConflictException(CONCURRENT_CHANGE_MESSAGE);
    }

    logger.info(`Updated User: <${storedUser.id}> by <${user.username}>`);
  }

  private async validatePatchAndGetStoredUser(
    request: UpdatePasswordRequest,
    user: UserSessionInfo
  ): Promise<User> {
    const storedUser = ensureFound(
      await this.authRepository.search(user.email),
      'User',
      user.email,
      'email'
    );

    if (!storedUser.password) {
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.ensureOldPasswordMatches(
      request.oldPassword,
      storedUser.password.value
    );
    this.ensurePasswordConfirmationMatches(
      request.password,
      request.repeatPassword
    );
    this.ensurePasswordDiffersFromOld(request.password, request.oldPassword);

    return storedUser;
  }

  private async ensureOldPasswordMatches(
    oldPassword: string,
    storedPasswordHash: string
  ): Promise<void> {
    const success = await this.encrypter.compare(
      oldPassword,
      storedPasswordHash
    );
    if (!success) {
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  private ensurePasswordConfirmationMatches(
    password: string,
    repeatPassword: string
  ): void {
    if (password !== repeatPassword) {
      throw new InvalidArgumentException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }
  }

  private ensurePasswordDiffersFromOld(
    password: string,
    oldPassword: string
  ): void {
    if (password === oldPassword) {
      throw new InvalidArgumentException(PASSWORD_MUST_DIFFER_FROM_OLD_MESSAGE);
    }
  }
}
