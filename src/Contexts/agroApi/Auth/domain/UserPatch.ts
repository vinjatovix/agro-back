import { AggregateRoot } from "../../../shared/domain/AggregateRoot.js";
import { PasswordHash, Uuid } from "../../../shared/domain/valueObject/index.js";
import { UserRoles } from "./UserRoles.js";


export class UserPatch extends AggregateRoot {
  readonly id: Uuid;
  readonly password?: PasswordHash;
  readonly emailValidated?: boolean;
  readonly roles?: UserRoles;

  constructor({
    id,
    password,
    emailValidated,
    roles
  }: {
    id: Uuid;
    password?: PasswordHash;
    emailValidated?: boolean;
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
      ...(this.roles !== undefined && { roles: this.roles.value })
    };
  }

  static fromPrimitives({
    id,
    password,
    emailValidated,
    roles
  }: {
    id: string;
    password?: string;
    emailValidated?: boolean;
    roles?: string[];
  }) {
    return new UserPatch({
      id: new Uuid(id),
      ...(password !== undefined && { password: new PasswordHash(password) }),
      ...(emailValidated !== undefined && { emailValidated }),
      ...(roles !== undefined && { roles: new UserRoles(roles) })
    });
  }
}
