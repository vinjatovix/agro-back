import { AggregateRoot } from '../../../shared/domain/AggregateRoot.js';
import {
  PasswordHash,
  Uuid
} from '../../../shared/domain/valueObject/index.js';
import {
  UserAuthMethod,
  type UserAuthMethodPrimitives
} from './UserAuthMethod.js';
import { UserRoles } from './UserRoles.js';

export class UserPatch extends AggregateRoot {
  readonly id: Uuid;
  readonly password?: PasswordHash;
  readonly emailValidated?: boolean;
  readonly authMethods?: UserAuthMethod[];
  readonly roles?: UserRoles;

  constructor({
    id,
    password,
    emailValidated,
    authMethods,
    roles
  }: {
    id: Uuid;
    password?: PasswordHash;
    emailValidated?: boolean;
    authMethods?: UserAuthMethod[];
    roles?: UserRoles;
  }) {
    super();
    this.id = id;
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
      id: this.id.value,
      ...(this.password !== undefined && { password: this.password.value }),
      ...(this.emailValidated !== undefined && {
        emailValidated: this.emailValidated
      }),
      ...(this.authMethods !== undefined && {
        authMethods: this.authMethods.map((method) => method.toPrimitives())
      }),
      ...(this.roles !== undefined && { roles: this.roles.value })
    };
  }

  static fromPrimitives({
    id,
    password,
    emailValidated,
    authMethods,
    roles
  }: {
    id: string;
    password?: string;
    emailValidated?: boolean;
    authMethods?: UserAuthMethodPrimitives[];
    roles?: string[];
  }) {
    return new UserPatch({
      id: new Uuid(id),
      ...(password !== undefined && { password: new PasswordHash(password) }),
      ...(emailValidated !== undefined && { emailValidated }),
      ...(authMethods !== undefined && {
        authMethods: authMethods.map((method) =>
          UserAuthMethod.fromPrimitives(method)
        )
      }),
      ...(roles !== undefined && { roles: new UserRoles(roles) })
    });
  }
}
