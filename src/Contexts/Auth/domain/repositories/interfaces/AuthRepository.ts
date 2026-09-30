import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { User } from '../../entities/User.js';
import type { UserPatch } from '../../entities/UserPatch.js';
import type { AuthProvider } from '../../value-objects/types/AuthProvider.js';

export interface AuthRepository {
  save(user: User): Promise<void>;

  /**
   * Writes the patch as received, including its metadata; never adds audit
   * data. Only the metadata fields the patch carries are overwritten: any other
   * field stored under `metadata` is kept.
   */
  update(user: UserPatch): Promise<void>;

  search(email: string): Promise<Nullable<User>>;

  searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>>;

  findByQuery(query: {
    id?: string;
    username?: string;
  }): Promise<Partial<User>[]>;
}
