import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import {
  buildLogger,
  type EncrypterTool,
  type OneTimeTokenTool
} from '../../../shared/plugins/index.js';
import { InvalidEmailTokenException } from '../../domain/errors/index.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import {
  PasswordHash,
  PlainPassword
} from '../../domain/value-objects/index.js';
import { PASSWORDS_DO_NOT_MATCH_MESSAGE } from '../messages.js';
import type { AccountNotifier } from '../notifications/index.js';

const logger = buildLogger('resetPassword');

export type ResetPasswordRequest = {
  token: string;
  password: string;
  repeatPassword: string;
};

export type ResetPasswordDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
  oneTimeToken: OneTimeTokenTool;
  accountNotifier: AccountNotifier;
};

export class ResetPassword {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;
  private readonly oneTimeToken: OneTimeTokenTool;
  private readonly accountNotifier: AccountNotifier;

  constructor({
    authRepository,
    encrypter,
    oneTimeToken,
    accountNotifier
  }: ResetPasswordDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
    this.oneTimeToken = oneTimeToken;
    this.accountNotifier = accountNotifier;
  }

  async run({
    token,
    password,
    repeatPassword
  }: ResetPasswordRequest): Promise<void> {
    new PlainPassword(password);
    if (password !== repeatPassword) {
      throw new InvalidArgumentException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }

    const tokenHash = this.oneTimeToken.hash(token);
    const user = await this.authRepository.searchByEmailToken(
      'passwordReset',
      tokenHash
    );
    if (user === null) {
      throw new InvalidEmailTokenException();
    }

    const before = user.toPrimitives();
    const passwordHash = new PasswordHash(await this.encrypter.hash(password));
    const now = new Date();
    user.resetPassword(tokenHash, passwordHash, now);

    const outcome = await this.authRepository.update(
      before,
      user.toPrimitives()
    );
    if (outcome === 'stale') {
      throw new InvalidEmailTokenException();
    }

    this.accountNotifier.passwordChanged(user.email);
    logger.info(`User <${user.username.value}> reset password`);
  }
}
