import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../shared/domain/repositories/WriteOutcome.js';
import type { UserPrimitives } from '../../entities/types/UserPrimitives.js';
import type { User } from '../../entities/User.js';
import type { AuthProvider } from '../../value-objects/types/AuthProvider.js';
import type { EmailTokenPurpose } from '../../value-objects/types/EmailTokenPrimitives.js';
import type { UserRole } from '../../value-objects/UserRoles.js';

/**
 * `created`, or which unique value another account already stores:
 * `emailTaken`, `usernameTaken` or `providerTaken` (a linked provider id).
 */
export type CreateUserOutcome =
  'created' | 'emailTaken' | 'usernameTaken' | 'providerTaken';

/**
 * `written`, `unchanged` (nothing to write) or `stale`: a field the write
 * changes no longer holds the value it was read with.
 */
export type UpdateUserOutcome = 'written' | 'unchanged' | 'stale';

export interface AuthRepository {
  /**
   * Inserts a new account, never overwriting one. A stored email, username
   * or provider id answers its outcome; a duplicate id throws
   * `DomainConflictException`.
   */
  create(user: User): Promise<CreateUserOutcome>;

  /**
   * Writes the difference between two full states of the same account
   * (`toPrimitives()` before and after its methods ran): `$set` for changed
   * fields, `$unset` for removed ones, metadata as given. Only matches while
   * every changed field (except `metadata`) still holds its `before` value.
   */
  update(
    before: UserPrimitives,
    after: UserPrimitives
  ): Promise<UpdateUserOutcome>;

  /**
   * Version-guarded role change. Writes the diff of two full states plus
   * `$inc: { version: 1 }`, matching only while `_id` and the read `version`
   * still hold. A conditional write that matches nothing throws
   * `DomainStaleVersionException` (412) or `DomainNotFoundException` (404)
   * after disambiguation. Returns `written` or `unchanged` (confirmed no-op).
   */
  updateRoles(
    before: UserPrimitives,
    after: UserPrimitives
  ): Promise<WriteOutcome>;

  /** Exact-equality lookup served by `users_username_unique`. */
  searchByUsername(username: string): Promise<Nullable<User>>;

  /** Count of accounts holding `role`; equality filter on `roles`. */
  countByRole(role: UserRole): Promise<number>;

  /**
   * Deletes the account only if it is still unvalidated and holds no
   * activation token valid after `at`. Answers whether it deleted it. Joins
   * the active unit of work, if any.
   */
  deleteIfReplaceable(user: User, at: Date): Promise<boolean>;

  search(email: string): Promise<Nullable<User>>;

  searchById(id: string): Promise<Nullable<User>>;

  /** The account holding a token of `purpose` with this hash, if any. */
  searchByEmailToken(
    purpose: EmailTokenPurpose,
    tokenHash: string
  ): Promise<Nullable<User>>;

  /** Served by the unique index `users_auth_provider_user_id_unique`. */
  searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>>;

  findByQuery(query: {
    id?: string;
    username?: string;
  }): Promise<Partial<User>[]>;
}
