import { createError } from '../../../../shared/errors/index.js';
import type { Serializable } from '../../../shared/domain/interfaces/Serializable.js';

export const USER_ROLES = ['admin', 'user'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export class UserRoles implements Serializable<UserRole[]> {
  private static readonly VALID_ROLES = new Set<UserRole>(USER_ROLES);
  readonly value: ReadonlyArray<UserRole>;

  constructor(value: string[]) {
    this.value = Object.freeze(UserRoles.ensureRoles(value));
  }

  has(role: UserRole): boolean {
    return this.value.includes(role);
  }

  toPrimitives(): UserRole[] {
    return [...this.value];
  }

  private static ensureRoles(value: string[]): UserRole[] {
    const uniqueRoles = Array.from(new Set(value));

    uniqueRoles.forEach((role) => {
      if (!UserRoles.VALID_ROLES.has(role as UserRole)) {
        throw createError.badRequest(
          `<UserRoles> does not allow the value <${role}>`
        );
      }
    });

    return uniqueRoles as UserRole[];
  }
}
