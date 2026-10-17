import { randomBytes, randomInt } from 'node:crypto';

import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import {
  DomainConflictException,
  DomainUnauthorizedException
} from '../../../shared/domain/errors/index.js';
import { Email } from '../../../shared/domain/valueObject/index.js';
import {
  buildLogger,
  type EncrypterTool,
  type GoogleIdTokenVerifierTool
} from '../../../shared/plugins/index.js';
import { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import {
  deriveUsernameBase,
  usernameWithSuffix
} from '../../domain/services/googleUsernameCandidates.js';
import { randomUserId } from '../../domain/UserId.js';
import { UserAuthMethod, Username } from '../../domain/value-objects/index.js';
import type { AuthenticateWithGoogleRequest } from '../interfaces/index.js';
import {
  CONCURRENT_CHANGE_MESSAGE,
  USER_NOT_CREATED_MESSAGE
} from '../messages.js';
import type { AccountNotifier } from '../notifications/index.js';

const logger = buildLogger('authenticateWithGoogle');
const INVALID_GOOGLE_TOKEN_MESSAGE = 'Invalid Google token';
const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';
const NUMBERED_USERNAME_TRIES = 3;

export type AuthenticateWithGoogleDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
  googleIdTokenVerifier: GoogleIdTokenVerifierTool;
  accountNotifier: AccountNotifier;
};

export class AuthenticateWithGoogle {
  private readonly authRepository: AuthRepository;
  private readonly encrypter: EncrypterTool;
  private readonly googleIdTokenVerifier: GoogleIdTokenVerifierTool;
  private readonly accountNotifier: AccountNotifier;

  constructor({
    authRepository,
    encrypter,
    googleIdTokenVerifier,
    accountNotifier
  }: AuthenticateWithGoogleDependencies) {
    this.authRepository = authRepository;
    this.encrypter = encrypter;
    this.googleIdTokenVerifier = googleIdTokenVerifier;
    this.accountNotifier = accountNotifier;
  }

  async run({ idToken }: AuthenticateWithGoogleRequest): Promise<string> {
    const tokenPayload =
      await this.googleIdTokenVerifier.verifyIdToken(idToken);

    if (!tokenPayload?.email || !tokenPayload?.sub) {
      throw new DomainUnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    if (!tokenPayload.emailVerified) {
      throw new DomainUnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    const user = await this.resolveUser(tokenPayload.email, tokenPayload.sub, {
      isRetry: false
    });
    return this.generateAuthToken(user);
  }

  private async resolveUser(
    email: string,
    providerUserId: string,
    retry: { isRetry: boolean }
  ): Promise<User> {
    const existingByProvider = await this.authRepository.searchByProvider(
      'google',
      providerUserId
    );

    if (existingByProvider) {
      logger.info(
        `User <${existingByProvider.username.value}> logged in with Google`
      );
      return existingByProvider;
    }

    return this.resolveByEmail(email, providerUserId, retry);
  }

  private async resolveByEmail(
    email: string,
    providerUserId: string,
    { isRetry }: { isRetry: boolean }
  ): Promise<User> {
    const existingByEmail = await this.authRepository.search(email);
    if (!existingByEmail) {
      return this.createGoogleUser(email, providerUserId, { isRetry });
    }

    const linked = await this.linkGoogle(existingByEmail, providerUserId);
    if (linked) return existingByEmail;

    // Another change landed between the read and the write: read once more.
    if (isRetry) {
      throw new DomainConflictException(CONCURRENT_CHANGE_MESSAGE);
    }

    return this.resolveByEmail(email, providerUserId, { isRetry: true });
  }

  /**
   * Links Google to an account found by email. Answers `false` when the
   * write lost a race (`stale`) and nothing was stored.
   */
  private async linkGoogle(
    user: User,
    providerUserId: string
  ): Promise<boolean> {
    const linkedMethod = user.findAuthMethod('google');
    if (linkedMethod && linkedMethod.providerUserId !== providerUserId) {
      throw new DomainUnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    const now = new Date();
    const before = user.toPrimitives();
    const outcome = user.linkProvider(
      new UserAuthMethod({ provider: 'google', providerUserId, linkedAt: now }),
      now
    );
    if (outcome === 'alreadyLinked') return true;

    const write = await this.authRepository.update(before, user.toPrimitives());
    if (write === 'stale') return false;

    if (outcome === 'linkedToActiveAccount') {
      this.accountNotifier.providerLinked(user.email, 'google', now);
    }

    logger.info(`User <${user.username.value}> linked Google authentication`);
    return true;
  }

  /**
   * Creates the account, or signs in to the one a concurrent request created
   * for the same email or Google identity (once; a second loss is a `409`).
   */
  private async createGoogleUser(
    email: string,
    providerUserId: string,
    { isRetry }: { isRetry: boolean }
  ): Promise<User> {
    const created = await this.insertGoogleUser(
      new Email(email),
      providerUserId
    );

    if (created) {
      logger.info(
        `Created user <${created.username.value}> with Google authentication`
      );
      return created;
    }

    if (isRetry) {
      throw new DomainConflictException(CONCURRENT_CHANGE_MESSAGE);
    }

    return this.resolveUser(email, providerUserId, { isRetry: true });
  }

  /**
   * Inserts with the first free username candidate. Answers `null` when
   * another account already stores the email or the Google identity.
   */
  private async insertGoogleUser(
    email: Email,
    providerUserId: string
  ): Promise<Nullable<User>> {
    const now = new Date();
    const method = new UserAuthMethod({
      provider: 'google',
      providerUserId,
      linkedAt: now
    });

    for (const username of this.usernameCandidates(email)) {
      const user = User.registerWithProvider({
        id: randomUserId(),
        email,
        username,
        method,
        at: now
      });
      const outcome = await this.authRepository.create(user);

      if (outcome === 'created') return user;
      if (outcome !== 'usernameTaken') return null;
    }

    throw new DomainConflictException(USER_NOT_CREATED_MESSAGE);
  }

  /**
   * The base derived from the email, then a few random 4-digit variants,
   * then one with 8 random hex characters.
   */
  private usernameCandidates(email: Email): Username[] {
    const base = deriveUsernameBase(email);
    const numbered = Array.from({ length: NUMBERED_USERNAME_TRIES }, () =>
      usernameWithSuffix(base, String(randomInt(1000, 10_000)))
    );

    return [
      new Username(base),
      ...numbered,
      usernameWithSuffix(base, randomBytes(4).toString('hex'))
    ];
  }

  private async generateAuthToken(user: User): Promise<string> {
    const token = await this.encrypter.generateToken({
      id: user.id,
      email: user.email.value,
      username: user.username.value,
      roles: user.roles.value
    });

    if (!token) {
      throw new DomainUnauthorizedException(TOKEN_GENERATION_ERROR_MESSAGE);
    }

    return token;
  }
}
