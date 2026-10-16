import type { RegisterUserRequest } from '../../../../../src/Contexts/Auth/application/index.js';
import { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import {
  createUserId,
  randomUserId,
  type UserId
} from '../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  type EmailToken,
  PasswordHash,
  UserAuthMethod,
  Username,
  type UserRoles
} from '../../../../../src/Contexts/Auth/domain/value-objects/index.js';
import type { AuthProvider } from '../../../../../src/Contexts/Auth/domain/value-objects/types/index.js';
import {
  Email,
  Metadata
} from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random } from '../../../shared/fixtures/index.js';
import { EmailTokenMother } from './EmailTokenMother.js';
import { UserRolesMother } from './UserRolesMother.js';

type PendingOptions = {
  id?: UserId;
  email?: Email;
  username?: Username;
  password?: PasswordHash;
  token?: EmailToken;
  at?: Date;
};

export class UserMother {
  static create({
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
    id?: UserId;
    email?: Email;
    username?: Username;
    password?: PasswordHash;
    emailValidated?: boolean;
    authMethods?: UserAuthMethod[];
    emailTokens?: EmailToken[];
    roles?: UserRoles;
    metadata?: Metadata;
  } = {}): User {
    const user = username ?? UserMother.randomUsername();
    return new User({
      id: id ?? randomUserId(),
      email: email ?? EmailMother.random(),
      username: user,
      password: password ?? UserMother.randomPasswordHash(),
      ...UserMother.optionalLists({ authMethods, emailTokens }),
      emailValidated: emailValidated ?? random.boolean(),
      roles: roles ?? UserRolesMother.random(),
      metadata: metadata ?? Metadata.create(user.value)
    });
  }

  /** Only the lists that were given, so `User` applies its own defaults. */
  private static optionalLists({
    authMethods,
    emailTokens
  }: {
    authMethods: UserAuthMethod[] | undefined;
    emailTokens: EmailToken[] | undefined;
  }): { authMethods?: UserAuthMethod[]; emailTokens?: EmailToken[] } {
    return {
      ...(authMethods !== undefined && { authMethods }),
      ...(emailTokens !== undefined && { emailTokens })
    };
  }

  static from(command: RegisterUserRequest): User {
    return this.create({
      email: new Email(command.email),
      username: new Username(command.username),
      password: UserMother.randomPasswordHash()
    });
  }

  static random(id?: string): User {
    return this.create({ id: createUserId(id ?? random.uuid()) });
  }

  /** A freshly registered account holding an unexpired activation token. */
  static pending({
    id,
    email,
    username,
    password,
    token,
    at
  }: PendingOptions = {}): User {
    const registeredAt = at ?? new Date();

    return User.register({
      id: id ?? randomUserId(),
      email: email ?? EmailMother.random(),
      username: username ?? UserMother.randomUsername(),
      password: password ?? UserMother.randomPasswordHash(),
      activationToken:
        token ??
        EmailTokenMother.activation({
          expiresAt: new Date(registeredAt.getTime() + 60 * 60 * 1000)
        }),
      at: registeredAt
    });
  }

  /** A pending account whose activation token expired before `at`. */
  static pendingExpired(
    at: Date = new Date(),
    options: Omit<PendingOptions, 'token' | 'at'> = {}
  ): User {
    const registeredAt = new Date(at.getTime() - 2 * 24 * 60 * 60 * 1000);

    return UserMother.pending({
      ...options,
      token: EmailTokenMother.expiredActivation(at),
      at: registeredAt
    });
  }

  /** A pending account that never got a token (stored before tokens existed). */
  static pendingWithoutToken(
    options: Omit<PendingOptions, 'token' | 'at'> = {}
  ): User {
    const { emailTokens: _emailTokens, ...primitives } =
      UserMother.pending(options).toPrimitives();

    return User.fromPrimitives(primitives);
  }

  /** A validated account with a local password and no token. */
  static active(options: Omit<PendingOptions, 'token' | 'at'> = {}): User {
    return UserMother.create({
      ...options,
      emailValidated: true,
      roles: UserRolesMother.create(['user'])
    });
  }

  /** A validated account with a local password, already linked to `provider`. */
  static activeLinkedTo(
    provider: Exclude<AuthProvider, 'local'>,
    providerUserId: string = random.guid(),
    options: Omit<PendingOptions, 'token' | 'at'> = {}
  ): User {
    const password = options.password ?? UserMother.randomPasswordHash();

    return UserMother.create({
      ...options,
      password,
      emailValidated: true,
      roles: UserRolesMother.create(['user']),
      authMethods: [
        UserAuthMethod.local(password, new Date()),
        UserMother.randomProviderMethod(provider, providerUserId)
      ]
    });
  }

  /** A validated account created by Google sign-in: no local password. */
  static googleOnly(providerUserId: string = random.guid()): User {
    const username = UserMother.randomUsername();

    return new User({
      id: randomUserId(),
      email: EmailMother.random(),
      username,
      emailValidated: true,
      authMethods: [UserMother.randomGoogleAuthMethod(providerUserId)],
      roles: UserRolesMother.create(['user']),
      metadata: Metadata.create(username.value)
    });
  }

  static randomUsername(): Username {
    return new Username(
      random.word({ min: Username.MIN_LENGTH, max: Username.MAX_LENGTH })
    );
  }

  static randomPasswordHash(): PasswordHash {
    return new PasswordHash(`$2b$10$${'a'.repeat(53)}`);
  }

  /** A different valid bcrypt hash from `randomPasswordHash`. */
  static otherPasswordHash(): PasswordHash {
    return new PasswordHash(`$2b$10$${'b'.repeat(53)}`);
  }

  static randomGoogleAuthMethod(
    providerUserId: string = random.guid()
  ): UserAuthMethod {
    return UserMother.randomProviderMethod('google', providerUserId);
  }

  static randomProviderMethod(
    provider: Exclude<AuthProvider, 'local'>,
    providerUserId: string = random.guid(),
    linkedAt: Date = new Date()
  ): UserAuthMethod {
    return new UserAuthMethod({ provider, providerUserId, linkedAt });
  }
}
