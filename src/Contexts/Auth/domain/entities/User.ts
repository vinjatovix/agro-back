import { AggregateRoot } from '../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../shared/domain/interfaces/Serializable.js';
import type { MetadataPrimitives } from '../../../shared/domain/MetadataPrimitives.js';
import { Email, Metadata } from '../../../shared/domain/valueObject/index.js';
import { InvalidEmailTokenException } from '../errors/index.js';
import { createUserId, type UserId } from '../UserId.js';
import {
  EmailToken,
  PasswordHash,
  UserAuthMethod,
  Username,
  UserRoles
} from '../value-objects/index.js';
import type {
  EmailTokenPrimitives,
  UserAuthMethodPrimitives
} from '../value-objects/types/index.js';
import type { UserPrimitives } from './types/UserPrimitives.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

/**
 * What linking a provider did to the account: nothing (`alreadyLinked`),
 * secured an unvalidated account by dropping its password
 * (`securedPendingAccount`), or added the provider to a validated account
 * that keeps its password (`linkedToActiveAccount`).
 */
export type ProviderLinkOutcome =
  'alreadyLinked' | 'securedPendingAccount' | 'linkedToActiveAccount';

type UserState = {
  email: Email;
  username: Username;
  password?: PasswordHash;
  emailValidated: boolean;
  authMethods: UserAuthMethod[];
  emailTokens: EmailToken[];
  roles: UserRoles;
  metadata: Metadata;
};

/**
 * PENDING while the email is not validated, ACTIVE once it is. A `local`
 * method exists if and only if `password` exists; at most one email token per
 * purpose; ACTIVE accounts carry no activation token.
 */
export class User
  extends AggregateRoot<UserId>
  implements Serializable<UserPrimitives>
{
  private state: Readonly<UserState>;

  constructor({
    id,
    email,
    username,
    password,
    emailValidated,
    authMethods,
    emailTokens,
    roles,
    metadata
  }: {
    id: UserId;
    email: Email;
    username: Username;
    password?: PasswordHash;
    emailValidated: boolean;
    authMethods?: UserAuthMethod[];
    emailTokens?: EmailToken[];
    roles: UserRoles;
    metadata: Metadata;
  }) {
    super(id);
    const normalizedAuthMethods = User.normalizeAuthMethods({
      ...(authMethods !== undefined && { authMethods }),
      ...(password !== undefined && { password }),
      linkedAt: metadata.createdAt ?? metadata.updatedAt
    });
    const localPassword =
      password ??
      normalizedAuthMethods.find((method) => method.isLocal())?.password;
    const tokens = emailTokens ? [...emailTokens] : [];
    User.ensureOneTokenPerPurpose(tokens);

    this.state = Object.freeze({
      email,
      username,
      ...(localPassword !== undefined && { password: localPassword }),
      emailValidated,
      authMethods: normalizedAuthMethods,
      emailTokens: tokens,
      roles,
      metadata
    });
  }

  /** A new PENDING account with its local password and one activation token. */
  static register({
    id,
    email,
    username,
    password,
    activationToken,
    at
  }: {
    id: UserId;
    email: Email;
    username: Username;
    password: PasswordHash;
    activationToken: EmailToken;
    at: Date;
  }): User {
    if (activationToken.purpose !== 'activation') {
      throw new InvalidArgumentException(
        '<User> registration requires an activation token'
      );
    }

    return new User({
      id,
      email,
      username,
      password,
      emailValidated: false,
      authMethods: [UserAuthMethod.local(password, at)],
      emailTokens: [activationToken],
      roles: new UserRoles(['user']),
      metadata: Metadata.create(username.value, at)
    });
  }

  static fromPrimitives({
    id,
    email,
    username,
    password,
    emailValidated,
    authMethods,
    emailTokens,
    roles,
    metadata
  }: {
    id: string;
    email: string;
    username: string;
    password?: string;
    emailValidated: boolean;
    authMethods?: UserAuthMethodPrimitives[];
    emailTokens?: EmailTokenPrimitives[];
    roles: string[];
    metadata: MetadataPrimitives;
  }): User {
    return new User({
      id: createUserId(id),
      email: new Email(email),
      username: new Username(username),
      ...(password !== undefined && { password: new PasswordHash(password) }),
      emailValidated,
      ...(authMethods !== undefined && {
        authMethods: authMethods.map((method) =>
          UserAuthMethod.fromPrimitives(method)
        )
      }),
      ...(emailTokens !== undefined && {
        emailTokens: emailTokens.map((token) =>
          EmailToken.fromPrimitives(token)
        )
      }),
      roles: new UserRoles(roles),
      metadata: Metadata.fromPrimitives(metadata)
    });
  }

  get email(): Email {
    return this.state.email;
  }

  get username(): Username {
    return this.state.username;
  }

  get password(): PasswordHash | undefined {
    return this.state.password;
  }

  get emailValidated(): boolean {
    return this.state.emailValidated;
  }

  get authMethods(): readonly UserAuthMethod[] {
    return this.state.authMethods;
  }

  get emailTokens(): readonly EmailToken[] {
    return this.state.emailTokens;
  }

  get roles(): UserRoles {
    return this.state.roles;
  }

  get metadata(): Metadata {
    return this.state.metadata;
  }

  toPrimitives(): UserPrimitives {
    const { password, emailTokens } = this.state;

    return {
      id: this.id,
      email: this.email.value,
      username: this.username.value,
      ...(password !== undefined && { password: password.value }),
      emailValidated: this.emailValidated,
      authMethods: this.authMethods.map((method) => method.toPrimitives()),
      ...(emailTokens.length > 0 && {
        emailTokens: emailTokens.map((token) => token.toPrimitives())
      }),
      roles: this.roles.toPrimitives(),
      metadata: this.metadata.toPrimitives()
    };
  }

  findAuthMethod(
    provider: UserAuthMethodPrimitives['provider']
  ): UserAuthMethod | undefined {
    return this.authMethods.find((method) => method.provider === provider);
  }

  /** Stores `token`, replacing any token of the same purpose. */
  issueEmailToken(token: EmailToken, at: Date): void {
    this.commit(
      {
        emailTokens: [
          ...this.state.emailTokens.filter(
            (stored) => stored.purpose !== token.purpose
          ),
          token
        ]
      },
      at
    );
  }

  /**
   * Validates the email with an unexpired activation token, which is used up
   * in the same change. Any other case is the same uniform refusal.
   */
  activate(tokenHash: string, at: Date): void {
    const token = this.state.emailValidated
      ? undefined
      : this.state.emailTokens.find((stored) =>
          stored.matches('activation', tokenHash)
        );

    if (token === undefined || token.isExpiredAt(at)) {
      throw new InvalidEmailTokenException();
    }

    this.commit(
      {
        emailValidated: true,
        emailTokens: this.state.emailTokens.filter((stored) => stored !== token)
      },
      at
    );
  }

  /** Replaces the local password, keeping when the local method was linked. */
  changePassword(hash: PasswordHash, at: Date): void {
    if (this.state.password === undefined) {
      throw new DomainUnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.commit(
      {
        password: hash,
        authMethods: this.state.authMethods.map((method) =>
          method.isLocal() ? method.withPassword(hash) : method
        )
      },
      at
    );
  }

  /**
   * Links a non-local provider. On an unvalidated account the provider proves
   * control of the email, so whatever password was set before (possibly by
   * someone else) is removed with every pending token.
   */
  linkProvider(method: UserAuthMethod, at: Date): ProviderLinkOutcome {
    if (method.isLocal()) {
      throw new InvalidArgumentException(
        '<User> only non-local providers can be linked'
      );
    }

    if (this.findAuthMethod(method.provider) !== undefined) {
      return 'alreadyLinked';
    }

    if (!this.state.emailValidated) {
      this.securePendingAccount(method, at);
      return 'securedPendingAccount';
    }

    this.commit({ authMethods: [...this.state.authMethods, method] }, at);
    return 'linkedToActiveAccount';
  }

  /** PENDING and without an unexpired activation token (none counts as expired). */
  isReplaceableAt(at: Date): boolean {
    return !this.state.emailValidated && !this.hasUnexpiredActivation(at);
  }

  canStartSession(emailValidationRequired: boolean): boolean {
    return !emailValidationRequired || this.state.emailValidated;
  }

  private securePendingAccount(method: UserAuthMethod, at: Date): void {
    const { password: _password, ...rest } = this.state;

    this.state = Object.freeze({
      ...rest,
      emailValidated: true,
      authMethods: [
        ...rest.authMethods.filter((stored) => !stored.isLocal()),
        method
      ],
      emailTokens: [],
      metadata: Metadata.update(rest.metadata, rest.username.value, at)
    });
  }

  private hasUnexpiredActivation(at: Date): boolean {
    return this.state.emailTokens.some(
      (token) => token.purpose === 'activation' && !token.isExpiredAt(at)
    );
  }

  /** Applies one change with the account's own username as the actor. */
  private commit(changes: Partial<UserState>, at: Date): void {
    this.state = Object.freeze({
      ...this.state,
      ...changes,
      metadata: Metadata.update(
        this.state.metadata,
        this.state.username.value,
        at
      )
    });
  }

  private static ensureOneTokenPerPurpose(tokens: EmailToken[]): void {
    const purposes = new Set(tokens.map((token) => token.purpose));
    const hashes = new Set(tokens.map((token) => token.tokenHash));

    if (purposes.size !== tokens.length || hashes.size !== tokens.length) {
      throw new InvalidArgumentException(
        '<User> holds at most one email token per purpose'
      );
    }
  }

  private static normalizeAuthMethods({
    authMethods,
    password,
    linkedAt
  }: {
    authMethods?: UserAuthMethod[];
    password?: PasswordHash;
    linkedAt: Date;
  }): UserAuthMethod[] {
    const methods = authMethods ? [...authMethods] : [];

    if (password !== undefined) {
      const localMethodIndex = methods.findIndex((method) => method.isLocal());
      const localMethod = methods[localMethodIndex];

      // A stored local method keeps when it was linked.
      if (localMethod !== undefined) {
        methods[localMethodIndex] = localMethod.withPassword(password);
      } else {
        methods.push(UserAuthMethod.local(password, linkedAt));
      }
    }

    return methods;
  }
}
