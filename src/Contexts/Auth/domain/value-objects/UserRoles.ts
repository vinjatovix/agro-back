import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../shared/domain/interfaces/Serializable.js';

export const USER_ROLES = ['admin', 'user'] as const;

export type UserRole = (typeof USER_ROLES)[number];

// The base role every account holds from registration; permanent and never
// manageable through the role delta.
export const BASE_ROLE: UserRole = 'user';

// The elevated roles an administrator can grant or revoke: a subset of the
// holdable roles, with the base role `user` deliberately excluded. Iteration 31
// widens this with `collaborator`.
export const MANAGEABLE_ROLES = ['admin'] as const;

export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

export class UserRoles implements Serializable<UserRole[]> {
  private static readonly VALID_ROLES = new Set<UserRole>(USER_ROLES);
  readonly value: ReadonlyArray<UserRole>;

  constructor(value: string[]) {
    this.value = Object.freeze(UserRoles.ensureRoles(value));
  }

  has(role: UserRole): boolean {
    return this.value.includes(role);
  }

  /** A new value object with `roles` unioned in (deduplicated). */
  add(roles: UserRole[]): UserRoles {
    return new UserRoles([...this.value, ...roles]);
  }

  /** A new value object without any of `roles`. */
  remove(roles: UserRole[]): UserRoles {
    const removed = new Set<UserRole>(roles);

    return new UserRoles(this.value.filter((role) => !removed.has(role)));
  }

  /** Order-independent set equality. */
  equals(other: UserRoles): boolean {
    return (
      this.value.length === other.value.length &&
      this.value.every((role) => other.has(role))
    );
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  toPrimitives(): UserRole[] {
    return [...this.value];
  }

  private static ensureRoles(value: string[]): UserRole[] {
    const uniqueRoles = Array.from(new Set(value));

    uniqueRoles.forEach((role) => {
      if (!UserRoles.VALID_ROLES.has(role as UserRole)) {
        throw new InvalidArgumentException(
          `<UserRoles> does not allow the value <${role}>`
        );
      }
    });

    return uniqueRoles as UserRole[];
  }
}
