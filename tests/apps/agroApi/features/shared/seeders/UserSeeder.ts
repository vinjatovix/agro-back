import { User } from '../../../../../../src/Contexts/Auth/domain/entities/User.js';
import type { AuthRepository } from '../../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  EmailToken,
  PasswordHash,
  UserAuthMethod,
  Username
} from '../../../../../../src/Contexts/Auth/domain/value-objects/index.js';
import { Email } from '../../../../../../src/Contexts/shared/domain/valueObject/index.js';
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
  | 'googleLinked';

export type SeededUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  /** Plain activation token, for pending states that hold one. */
  activationToken?: string;
};

export type UserSeedOptions = Partial<
  Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>
> & {
  state?: SeededUserState;
  /** Google identity linked by `googleLinked`. */
  googleSub?: string;
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
  const register = (
    seed: Required<Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>>,
    tokenHash: string,
    { issuedAt, expiresAt }: { issuedAt: Date; expiresAt: Date }
  ): User =>
    User.register({
      id: createUserId(seed.id),
      email: new Email(seed.email),
      username: new Username(seed.username),
      password: new PasswordHash(encrypter.hash(seed.password)),
      activationToken: EmailToken.create({
        purpose: 'activation',
        tokenHash,
        expiresAt
      }),
      at: issuedAt
    });

  const build = (
    seed: Required<Pick<SeededUser, 'id' | 'username' | 'email' | 'password'>>,
    { state = 'active', googleSub }: UserSeedOptions
  ): { user: User; activationToken?: string } => {
    const now = new Date();
    const { token, tokenHash } = oneTimeToken.generate();

    if (state === 'pendingExpired') {
      const user = register(seed, tokenHash, {
        issuedAt: new Date(now.getTime() - 25 * HOUR_MS),
        expiresAt: new Date(now.getTime() - HOUR_MS)
      });
      return { user, activationToken: token };
    }

    const user = register(seed, tokenHash, {
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

    return { user };
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
      const { user, activationToken } = build(seed, options);

      const outcome = await authRepository.create(user);
      if (outcome !== 'created') {
        throw new TypeError(`UserSeeder: ${seed.email} is already stored`);
      }

      return {
        ...seed,
        ...(activationToken !== undefined && { activationToken })
      };
    }
  };
};
