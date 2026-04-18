import { createError } from '../../../../../shared/errors/index.js';
import { PasswordHash } from '../../../../shared/domain/valueObject/index.js';
import { buildLogger, type EncrypterTool } from '../../../../shared/plugins/index.js';
import { PlainPassword, UserPatch, Username } from '../../domain/index.js';
import type { UserRepository } from '../../domain/interfaces/index.js';
import type {
  UpdatePasswordRequest,
  UserSessionInfo
} from '../interfaces/index.js';

const logger = buildLogger('updatePassword');
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'Passwords do not match';
const PASSWORD_MUST_DIFFER_FROM_OLD_MESSAGE =
  'New password must be different from old password';

export class UpdatePassword {
  constructor(
    private readonly repository: UserRepository,
    private readonly encrypter: EncrypterTool
  ) {}

  async run(
    { password, repeatPassword, oldPassword }: UpdatePasswordRequest,
    user: UserSessionInfo
  ): Promise<void> {
    await this.validatePatch({ password, repeatPassword, oldPassword }, user);

    const newPassword = new PlainPassword(password);
    const encryptedPassword = new PasswordHash(
      this.encrypter.hash(newPassword.value)
    );
    const userPatch = UserPatch.fromPrimitives({
      id: user.id,
      password: encryptedPassword.value
    });

    await this.repository.update(userPatch, new Username(user.username));
    logger.info(`Updated User: <${userPatch.id}> by <${user.username}>`);
  }

  private async validatePatch(
    request: UpdatePasswordRequest,
    user: UserSessionInfo
  ): Promise<void> {
    const storedUser = await this.repository.search(user.email);

    if (!storedUser) {
      throw createError.notFound(`User <${user.id}>`);
    }

    this.ensureOldPasswordMatches(request.oldPassword, storedUser.password.value);
    this.ensurePasswordConfirmationMatches(
      request.password,
      request.repeatPassword
    );
    this.ensurePasswordDiffersFromOld(request.password, request.oldPassword);
  }

  private ensureOldPasswordMatches(
    oldPassword: string,
    storedPasswordHash: string
  ): void {
    const success = this.encrypter.compare(oldPassword, storedPasswordHash);
    if (!success) {
      throw createError.auth(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  private ensurePasswordConfirmationMatches(
    password: string,
    repeatPassword: string
  ): void {
    if (password !== repeatPassword) {
      throw createError.auth(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }
  }

  private ensurePasswordDiffersFromOld(
    password: string,
    oldPassword: string
  ): void {
    if (password === oldPassword) {
      throw createError.auth(PASSWORD_MUST_DIFFER_FROM_OLD_MESSAGE);
    }
  }
}
