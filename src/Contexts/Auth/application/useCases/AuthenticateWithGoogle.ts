import {
  DomainConflictException,
  DomainUnauthorizedException
} from '../../../shared/domain/errors/index.js';
import { Email, Metadata } from '../../../shared/domain/valueObject/index.js';
import {
  buildLogger,
  type EncrypterTool,
  type GoogleIdTokenVerifierTool
} from '../../../shared/plugins/index.js';
import { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import { randomUserId } from '../../domain/UserId.js';
import {
  UserAuthMethod,
  Username,
  UserRoles
} from '../../domain/value-objects/index.js';
import type { AuthenticateWithGoogleRequest } from '../interfaces/index.js';
import { CONCURRENT_CHANGE_MESSAGE } from '../messages.js';
import type { AccountNotifier } from '../notifications/index.js';

const logger = buildLogger('authenticateWithGoogle');
const INVALID_GOOGLE_TOKEN_MESSAGE = 'Invalid Google token';
const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';

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

    const user = await this.resolveUser(tokenPayload.email, tokenPayload.sub);
    return this.generateAuthToken(user);
  }

  private async resolveUser(
    email: string,
    providerUserId: string
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

    return this.resolveByEmail(email, providerUserId, { isRetry: false });
  }

  private async resolveByEmail(
    email: string,
    providerUserId: string,
    { isRetry }: { isRetry: boolean }
  ): Promise<User> {
    const existingByEmail = await this.authRepository.search(email);
    if (!existingByEmail) {
      return this.createGoogleUser(email, providerUserId);
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

  private async createGoogleUser(
    email: string,
    providerUserId: string
  ): Promise<User> {
    const username = this.deriveUsernameFromEmail(email);
    const date = new Date();

    const user = new User({
      id: randomUserId(),
      email: new Email(email),
      username,
      emailValidated: true,
      authMethods: [
        new UserAuthMethod({
          provider: 'google',
          providerUserId,
          linkedAt: date
        })
      ],
      roles: new UserRoles(['user']),
      metadata: Metadata.create(username.value)
    });

    await this.authRepository.save(user);
    logger.info(
      `Created user <${user.username.value}> with Google authentication`
    );

    return user;
  }

  private deriveUsernameFromEmail(email: string): Username {
    const localPart = email.split('@')[0] ?? '';
    const normalized = localPart.replaceAll(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const minLength = Username.MIN_LENGTH;
    const maxLength = Username.MAX_LENGTH;
    const fallback = 'user';
    const base = normalized.length > 0 ? normalized : fallback;

    const padded =
      base.length >= minLength
        ? base
        : `${base}${fallback}`.slice(0, minLength);

    return new Username(padded.slice(0, maxLength));
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
