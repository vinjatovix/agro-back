import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { User } from '../../entities/User.js';
import type { UserPatch } from '../../entities/UserPatch.js';
import type { Username } from '../../value-objects/index.js';
import type { AuthProvider } from '../../value-objects/types/AuthProvider.js';

export interface UserRepository {
  save(user: User): Promise<void>;

  update(user: UserPatch, username: Username): Promise<void>;

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
