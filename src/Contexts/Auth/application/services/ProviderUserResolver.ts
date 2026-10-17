import { randomBytes, randomInt } from 'node:crypto';

import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import {
  DomainConflictException,
  DomainUnauthorizedException
} from '../../../shared/domain/errors/index.js';
import { Email } from '../../../shared/domain/valueObject/index.js';
import { buildLogger } from '../../../shared/plugins/index.js';
import { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import {
  deriveUsernameBase,
  usernameWithSuffix
} from '../../domain/services/providerUsernameCandidates.js';
import { randomUserId } from '../../domain/UserId.js';
import { UserAuthMethod, Username } from '../../domain/value-objects/index.js';
import type { AuthProvider } from '../../domain/value-objects/types/index.js';
import {
  CONCURRENT_CHANGE_MESSAGE,
  USER_NOT_CREATED_MESSAGE
} from '../messages.js';
import type { AccountNotifier } from '../notifications/index.js';

const logger = buildLogger('providerUserResolver');
const NUMBERED_USERNAME_TRIES = 3;

const PROVIDER_LABELS: Partial<Record<AuthProvider, string>> = {
  google: 'Google',
  github: 'GitHub'
};

const providerLabel = (provider: AuthProvider): string =>
  PROVIDER_LABELS[provider] ?? provider;

/**
 * One provider sign-in to resolve. `provider` and `providerUserId` identify the
 * external identity, `email` the one provided by the provider, and
 * `invalidAuthorizationMessage` the uniform `401` text for this provider when
 * the email belongs to an account linked to a different id of it.
 */
export type ResolveProviderUser = {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  invalidAuthorizationMessage: string;
};

export type ProviderUserResolverDependencies = {
  authRepository: AuthRepository;
  accountNotifier: AccountNotifier;
};

/**
 * The resolution step both Google and GitHub run: find by provider id, then by
 * email, then link or create, with retry-once race handling and the
 * pre-hijacking link rules. Extracted (not copied) so a change to linking or
 * creation can never apply to one provider and not the other.
 */
export class ProviderUserResolver {
  private readonly authRepository: AuthRepository;
  private readonly accountNotifier: AccountNotifier;

  constructor({
    authRepository,
    accountNotifier
  }: ProviderUserResolverDependencies) {
    this.authRepository = authRepository;
    this.accountNotifier = accountNotifier;
  }

  async resolve(request: ResolveProviderUser): Promise<User> {
    return this.resolveUser(request, { isRetry: false });
  }

  private async resolveUser(
    request: ResolveProviderUser,
    retry: { isRetry: boolean }
  ): Promise<User> {
    const existingByProvider = await this.authRepository.searchByProvider(
      request.provider,
      request.providerUserId
    );

    if (existingByProvider) {
      logger.info(
        `User <${existingByProvider.username.value}> logged in with ${providerLabel(request.provider)}`
      );
      return existingByProvider;
    }

    return this.resolveByEmail(request, retry);
  }

  private async resolveByEmail(
    request: ResolveProviderUser,
    { isRetry }: { isRetry: boolean }
  ): Promise<User> {
    const existingByEmail = await this.authRepository.search(request.email);
    if (!existingByEmail) {
      return this.createUser(request, { isRetry });
    }

    const linked = await this.linkProvider(existingByEmail, request);
    if (linked) return existingByEmail;

    // Another change landed between the read and the write: read once more.
    if (isRetry) {
      throw new DomainConflictException(CONCURRENT_CHANGE_MESSAGE);
    }

    return this.resolveByEmail(request, { isRetry: true });
  }

  /**
   * Links the provider to an account found by email. Answers `false` when the
   * write lost a race (`stale`) and nothing was stored.
   */
  private async linkProvider(
    user: User,
    request: ResolveProviderUser
  ): Promise<boolean> {
    const linkedMethod = user.findAuthMethod(request.provider);
    if (
      linkedMethod &&
      linkedMethod.providerUserId !== request.providerUserId
    ) {
      throw new DomainUnauthorizedException(
        request.invalidAuthorizationMessage
      );
    }

    const now = new Date();
    const before = user.toPrimitives();
    const outcome = user.linkProvider(
      new UserAuthMethod({
        provider: request.provider,
        providerUserId: request.providerUserId,
        linkedAt: now
      }),
      now
    );
    if (outcome === 'alreadyLinked') return true;

    const write = await this.authRepository.update(before, user.toPrimitives());
    if (write === 'stale') return false;

    if (outcome === 'linkedToActiveAccount') {
      this.accountNotifier.providerLinked(user.email, request.provider, now);
    }

    logger.info(
      `User <${user.username.value}> linked ${providerLabel(request.provider)} authentication`
    );
    return true;
  }

  /**
   * Creates the account, or signs in to the one a concurrent request created
   * for the same email or provider identity (once; a second loss is a `409`).
   */
  private async createUser(
    request: ResolveProviderUser,
    { isRetry }: { isRetry: boolean }
  ): Promise<User> {
    const created = await this.insertUser(new Email(request.email), request);

    if (created) {
      logger.info(
        `Created user <${created.username.value}> with ${providerLabel(request.provider)} authentication`
      );
      return created;
    }

    if (isRetry) {
      throw new DomainConflictException(CONCURRENT_CHANGE_MESSAGE);
    }

    return this.resolveUser(request, { isRetry: true });
  }

  /**
   * Inserts with the first free username candidate. Answers `null` when
   * another account already stores the email or the provider identity.
   */
  private async insertUser(
    email: Email,
    request: ResolveProviderUser
  ): Promise<Nullable<User>> {
    const now = new Date();
    const method = new UserAuthMethod({
      provider: request.provider,
      providerUserId: request.providerUserId,
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
}
