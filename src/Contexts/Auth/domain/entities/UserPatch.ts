import type { Metadata } from '../../../shared/domain/valueObject/index.js';
import type { UserId } from '../UserId.js';
import type {
  PasswordHash,
  UserAuthMethod,
  UserRoles
} from '../value-objects/index.js';

/**
 * Partial write of a User. Always carries the audit metadata of the change,
 * computed in memory (`Metadata.update`): storage never adds its own.
 */
export class UserPatch {
  readonly id: UserId;
  readonly metadata: Metadata;
  readonly password?: PasswordHash;
  readonly emailValidated?: boolean;
  readonly authMethods?: UserAuthMethod[];
  readonly roles?: UserRoles;

  constructor({
    id,
    metadata,
    password,
    emailValidated,
    authMethods,
    roles
  }: {
    id: UserId;
    metadata: Metadata;
    password?: PasswordHash;
    emailValidated?: boolean;
    authMethods?: UserAuthMethod[];
    roles?: UserRoles;
  }) {
    this.id = id;
    this.metadata = metadata;
    if (password !== undefined) {
      this.password = password;
    }
    if (emailValidated !== undefined) {
      this.emailValidated = emailValidated;
    }
    if (authMethods !== undefined) {
      this.authMethods = authMethods;
    }
    if (roles !== undefined) {
      this.roles = roles;
    }
  }

  toPrimitives() {
    return {
      id: this.id,
      ...(this.password !== undefined && { password: this.password.value }),
      ...(this.emailValidated !== undefined && {
        emailValidated: this.emailValidated
      }),
      ...(this.authMethods !== undefined && {
        authMethods: this.authMethods.map((method) => method.toPrimitives())
      }),
      ...(this.roles !== undefined && { roles: this.roles.value }),
      metadata: this.metadata.toPrimitives()
    };
  }
}
