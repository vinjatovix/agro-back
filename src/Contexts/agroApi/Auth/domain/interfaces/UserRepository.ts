import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { AuthProvider, User, Username, UserPatch } from '../index.js';

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
