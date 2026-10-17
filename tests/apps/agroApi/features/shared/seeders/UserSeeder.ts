import { User } from '../../../../../../src/Contexts/Auth/domain/entities/User.js';
import type { AuthRepository } from '../../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  EmailToken,
  PASSWORD_RESET_THROTTLE_WINDOW_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
  PasswordHash,
  UserAuthMethod,
  Username,
  UserRoles
} from '../../../../../../src/Contexts/Auth/domain/value-objects/index.js';
import {
  Email,
  Metadata
} from '../../../../../../src/Contexts/shared/domain/valueObject/index.js';
import type {
  EncrypterTool,
  OneTimeTokenTool
} from '../../../../../../src/Contexts/shared/plugins/index.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

/** Password of every seeded account with a local password. */
export const SEEDED_PASSWORD = 'Abcdef1!';

const HOUR_MS = 60 * 60 * 1000;

export type SeededUserState =
  | 'active'
  | 'pending'
  | 'pendingExpired'
  | 'pendingWithoutToken'
  | 'googleLinked'
  | 'googleOnly'
  | 'githubLinked';

/**
 * When the seeded reset token was issued: `recent` is inside the throttle
 * window, `valid` is past it but unexpired, `expired` can no longer be used.
 */
export type SeededResetToken = 'recent' | 'valid' | 'expired';

const RESET_TOKEN_ISSUED_AGO_MS: Record<SeededResetToken, number> = {
  recent: 0,
  valid: PASSWORD_RESET_THROTTLE_WINDOW_MS + 60 * 1000,
  expired: PASSWORD_RESET_TOKEN_TTL_MS + HOUR_MS
};

const buildGoogleOnlyUser = (
  seed: Required<Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>>,
  googleSub: string | undefined,
  now: Date
): User =>
  new User({
    id: createUserId(seed.id),
    email: new Email(seed.email),
    username: new Username(seed.username),
    emailValidated: true,
    authMethods: [
      new UserAuthMethod({
        provider: 'google',
        providerUserId: googleSub ?? `google-sub-${random.uuid()}`,
        linkedAt: now
      })
    ],
    roles: new UserRoles(['user']),
    metadata: Metadata.create(seed.username, now)
  });

export type SeededUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  /** Plain activation token, for pending states that hold one. */
  activationToken?: string;
  /** Plain password reset token, when one was seeded. */
  resetToken?: string;
};

export type UserSeedOptions = Partial<
  Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>
> & {
  state?: SeededUserState;
  /** Google identity of `googleLinked` and `googleOnly`. */
  googleSub?: string;
  /** GitHub numeric identity of `githubLinked`. */
  githubUserId?: string;
  /** Adds a password reset token to the account, whatever its state. */
  resetToken?: SeededResetToken;
};

export type UserSeederDependencies = {
  authRepository: AuthRepository;
  encrypter: EncrypterTool;
  oneTimeToken: OneTimeTokenTool;
};

/**
 * Stores accounts directly in the database, so scenarios never depend on the
 * registration rules. Accounts are validated unless another state is asked.
 */
export const UserSeeder = ({
  authRepository,
  encrypter,
  oneTimeToken
}: UserSeederDependencies) => {
  const register = async (
    seed: Required<Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>>,
    tokenHash: string,
    { issuedAt, expiresAt }: { issuedAt: Date; expiresAt: Date }
  ): Promise<User> =>
    User.register({
      id: createUserId(seed.id),
      email: new Email(seed.email),
      username: new Username(seed.username),
      password: new PasswordHash(await encrypter.hash(seed.password)),
      activationToken: EmailToken.create({
        purpose: 'activation',
        tokenHash,
        expiresAt
      }),
      at: issuedAt
    });

  const build = async (
    seed: Required<Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>>,
    { state = 'active', googleSub, githubUserId }: UserSeedOptions
  ): Promise<{ user: User; activationToken?: string }> => {
    const now = new Date();
    const { token, tokenHash } = oneTimeToken.generate();

    if (state === 'googleOnly') {
      return { user: buildGoogleOnlyUser(seed, googleSub, now) };
    }

    if (state === 'pendingExpired') {
      const user = await register(seed, tokenHash, {
        issuedAt: new Date(now.getTime() - 25 * HOUR_MS),
        expiresAt: new Date(now.getTime() - HOUR_MS)
      });
      return { user, activationToken: token };
    }

    const user = await register(seed, tokenHash, {
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 24 * HOUR_MS)
    });

    if (state === 'pending') return { user, activationToken: token };

    if (state === 'pendingWithoutToken') {
      const { emailTokens: _emailTokens, ...primitives } = user.toPrimitives();
      return { user: User.fromPrimitives(primitives) };
    }

    user.activate(tokenHash, now);
    if (state === 'googleLinked') {
      user.linkProvider(
        new UserAuthMethod({
          provider: 'google',
          providerUserId: googleSub ?? `google-sub-${random.uuid()}`,
          linkedAt: now
        }),
        now
      );
    }

    if (state === 'githubLinked') {
      user.linkProvider(
        new UserAuthMethod({
          provider: 'github',
          providerUserId: githubUserId ?? `github-${random.uuid()}`,
          linkedAt: now
        }),
        now
      );
    }

    return { user };
  };

  /** Issues a reset token as the given time ago and returns it in plain. */
  const issueResetToken = (user: User, issued: SeededResetToken): string => {
    const now = new Date();
    const { token, tokenHash } = oneTimeToken.generate();
    const issuedAt = new Date(
      now.getTime() - RESET_TOKEN_ISSUED_AGO_MS[issued]
    );

    user.issueEmailToken(EmailToken.passwordReset(tokenHash, issuedAt), now);

    return token;
  };

  return {
    async create(options: UserSeedOptions = {}): Promise<SeededUser> {
      const seed = {
        id: options.id ?? random.uuid(),
        username: options.username ?? random.word({ min: 8, max: 20 }),
        email:
          options.email ?? `${random.word({ min: 8, max: 20 })}@seeded.com`,
        password: options.password ?? SEEDED_PASSWORD
      };
      const { user, activationToken } = await build(seed, options);
      const resetToken =
        options.resetToken === undefined
          ? undefined
          : issueResetToken(user, options.resetToken);

      const outcome = await authRepository.create(user);
      if (outcome !== 'created') {
        throw new TypeError(`UserSeeder: ${seed.email} is already stored`);
      }

      return {
        ...seed,
        ...(activationToken !== undefined && { activationToken }),
        ...(resetToken !== undefined && { resetToken })
      };
    }
  };
};
