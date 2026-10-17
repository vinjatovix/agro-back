import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import type { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';

export type LookupUserInput = {
  email?: string;
  username?: string;
};

export type LookupUserDependencies = {
  authRepository: AuthRepository;
};

export class LookupUser {
  private readonly authRepository: AuthRepository;

  constructor({ authRepository }: LookupUserDependencies) {
    this.authRepository = authRepository;
  }

  /**
   * Resolves an account by exactly one of email or username (the request
   * schema enforces the "exactly one" rule). Not found → 404.
   */
  async execute(input: LookupUserInput): Promise<UserPrimitives> {
    const { key, found } = await this.resolve(input);

    return ensureFound(found, 'User', key).toPrimitives();
  }

  private async resolve(
    input: LookupUserInput
  ): Promise<{ key: string; found: Nullable<User> }> {
    if (input.email !== undefined) {
      return {
        key: input.email,
        found: await this.authRepository.search(input.email)
      };
    }

    const username = input.username ?? '';

    return {
      key: username,
      found: await this.authRepository.searchByUsername(username)
    };
  }
}
