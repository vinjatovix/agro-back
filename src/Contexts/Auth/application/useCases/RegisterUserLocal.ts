import type { UnitOfWork } from '../../../shared/application/interfaces/index.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../shared/domain/errors/index.js';
import { Email } from '../../../shared/domain/valueObject/index.js';
import {
  buildLogger,
  type EncrypterTool,
  type OneTimeTokenTool
} from '../../../shared/plugins/index.js';
import { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import { createUserId, type UserId } from '../../domain/UserId.js';
import {
  EmailToken,
  PasswordHash,
  PlainPassword,
  Username
} from '../../domain/value-objects/index.js';
import type { RegisterUserRequest } from '../interfaces/index.js';
import {
  PASSWORDS_DO_NOT_MATCH_MESSAGE,
  USERNAME_TAKEN_MESSAGE
} from '../messages.js';
import type { AccountNotifier } from '../notifications/index.js';

const logger = buildLogger('registerUser');

type Registration = { user: User; token: string };

type Applicant = {
  id: UserId;
  email: Email;
  username: Username;
  password: PasswordHash;
};

/**
 * Aborts the replacement unit when another registration stored the email
 * after the delete. Internal: the request still gets the uniform answer.
 */
class ReplacementLostRaceSignal extends Error {}

export type RegisterUserLocalDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
  oneTimeToken: OneTimeTokenTool;
  accountNotifier: AccountNotifier;
  unitOfWork: UnitOfWork;
};

/**
 * Resolves the same way for every well-formed registration, whether or not
 * the email has an account: only the id and the username can be refused.
 * Emails leave in the background.
 */
export class RegisterUserLocal {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;
  private readonly oneTimeToken: OneTimeTokenTool;
  private readonly accountNotifier: AccountNotifier;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    authRepository,
    encrypter,
    oneTimeToken,
    accountNotifier,
    unitOfWork
  }: RegisterUserLocalDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
    this.oneTimeToken = oneTimeToken;
    this.accountNotifier = accountNotifier;
    this.unitOfWork = unitOfWork;
  }

  async run(request: RegisterUserRequest): Promise<void> {
    const applicant = await this.validateApplicant(request);

    // Refused before the email is resolved; only the replaceable account of
    // that same email may give its username back.
    await this.ensureIdIsFree(applicant.id);

    const now = new Date();
    const existing = await this.authRepository.search(applicant.email.value);
    await this.ensureUsernameIsFree(applicant.username.value, existing, now);

    if (existing === null) {
      await this.createAndNotify(this.newRegistration(applicant, now));
      return;
    }

    if (existing.isReplaceableAt(now)) {
      await this.replace(existing, this.newRegistration(applicant, now), now);
      return;
    }

    this.notifyExistingOwner(existing);
  }

  /**
   * Every rule on the request runs before any lookup, so a 400 never depends
   * on what is stored. The password is hashed on every path, so all of them
   * do the same costly work.
   */
  private async validateApplicant(
    request: RegisterUserRequest
  ): Promise<Applicant> {
    const plainPassword = new PlainPassword(request.password);
    this.validatePasswordConfirmation(request.password, request.repeatPassword);
    const id = createUserId(request.id);
    const email = new Email(request.email);
    const username = new Username(request.username);

    return {
      id,
      email,
      username,
      password: new PasswordHash(await this.encrypter.hash(plainPassword.value))
    };
  }

  private newRegistration(
    { id, email, username, password }: Applicant,
    at: Date
  ): Registration {
    const { token, tokenHash } = this.oneTimeToken.generate();
    const user = User.register({
      id,
      email,
      username,
      password,
      activationToken: EmailToken.activation(tokenHash, at),
      at
    });

    return { user, token };
  }

  /** A duplicate-email race (`emailTaken`) is answered like any other path. */
  private async createAndNotify({ user, token }: Registration): Promise<void> {
    const outcome = await this.authRepository.create(user);
    if (outcome === 'emailTaken') return;

    this.accountNotifier.activation(user.email, token);
    logger.info(`User <${user.username.value}> registered`);
  }

  /**
   * Replaces a pending account whose activation expired, in one unit: if it
   * was activated or linked meanwhile, or the email was taken again after the
   * delete, nothing is written and nothing is sent.
   */
  private async replace(
    existing: User,
    { user, token }: Registration,
    at: Date
  ): Promise<void> {
    let replaced: boolean;

    try {
      replaced = await this.unitOfWork.run(async () => {
        if (!(await this.authRepository.deleteIfReplaceable(existing, at))) {
          return false;
        }
        if ((await this.authRepository.create(user)) === 'emailTaken') {
          throw new ReplacementLostRaceSignal();
        }

        return true;
      });
    } catch (error: unknown) {
      if (error instanceof ReplacementLostRaceSignal) return;
      throw error;
    }

    if (!replaced) return;

    this.accountNotifier.activation(user.email, token);
    logger.info(`User <${user.username.value}> registered again`);
  }

  /** A pending account with a valid link is left alone: no write, no email. */
  private notifyExistingOwner(existing: User): void {
    if (existing.emailValidated) {
      this.accountNotifier.registrationAttempt(existing.email);
    }
  }

  private async ensureIdIsFree(id: string): Promise<void> {
    const storedUser = await this.authRepository.findByQuery({ id });
    if (storedUser.length > 0) {
      throw new DomainConflictException(`User with id ${id} already exists`);
    }
  }

  /**
   * Every stored account holds its username, except the expired pending
   * account of the same email that this registration replaces.
   */
  private async ensureUsernameIsFree(
    username: string,
    existing: User | null,
    at: Date
  ): Promise<void> {
    const holders = await this.authRepository.findByQuery({ username });
    const replaced =
      existing !== null && existing.isReplaceableAt(at) ? existing.id : null;

    if (holders.some((holder) => holder.id !== replaced)) {
      throw new DomainConflictException(USERNAME_TAKEN_MESSAGE);
    }
  }

  private validatePasswordConfirmation(
    password: string,
    repeatPassword?: string
  ): void {
    if (repeatPassword !== undefined && password !== repeatPassword) {
      throw new InvalidArgumentException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }
  }
}
