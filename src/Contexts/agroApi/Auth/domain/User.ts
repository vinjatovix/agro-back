import { AggregateRoot } from '../../../shared/domain/AggregateRoot.js';
import {
  Email,
  Metadata,
  PasswordHash,
  Uuid
} from '../../../shared/domain/valueObject/index.js';
import type { MetadataType } from '../../../shared/infrastructure/persistence/mongo/types/MetadataType.js';
import { Username } from './Username.js';
import {
  UserAuthMethod,
  type UserAuthMethodPrimitives
} from './UserAuthMethod.js';
import { UserRoles } from './UserRoles.js';

export class User extends AggregateRoot {
  readonly id: Uuid;
  readonly email: Email;
  readonly username: Username;
  readonly password?: PasswordHash;
  readonly emailValidated: boolean;
  readonly authMethods: UserAuthMethod[];
  readonly roles: UserRoles;
  readonly metadata: Metadata;

  constructor({
    id,
    email,
    username,
    password,
    emailValidated,
    authMethods,
    roles,
    metadata
  }: {
    id: Uuid;
    email: Email;
    username: Username;
    password?: PasswordHash;
    emailValidated: boolean;
    authMethods?: UserAuthMethod[];
    roles: UserRoles;
    metadata: Metadata;
  }) {
    super();
    const normalizedAuthMethods = User.normalizeAuthMethods({
      ...(authMethods !== undefined && { authMethods }),
      ...(password !== undefined && { password }),
      linkedAt: metadata.createdAt ?? metadata.updatedAt
    });

    this.id = id;
    this.email = email;
    this.username = username;
    this.authMethods = normalizedAuthMethods;
    const localPassword =
      password ??
      normalizedAuthMethods.find((method) => method.isLocal())?.password;
    if (localPassword !== undefined) {
      this.password = localPassword;
    }
    this.emailValidated = emailValidated;
    this.roles = roles;
    this.metadata = metadata;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      id: this.id.value,
      email: this.email.value,
      username: this.username.value,
      ...(this.password !== undefined && { password: this.password.value }),
      emailValidated: this.emailValidated,
      authMethods: this.authMethods.map((method) => method.toPrimitives()),
      roles: this.roles.toPrimitives(),
      metadata: this.metadata.toPrimitives()
    };
  }

  static fromPrimitives({
    id,
    email,
    username,
    password,
    emailValidated,
    authMethods,
    roles,
    metadata
  }: {
    id: string;
    email: string;
    username: string;
    password?: string;
    emailValidated: boolean;
    authMethods?: UserAuthMethodPrimitives[];
    roles: string[];
    metadata: MetadataType;
  }): User {
    return new User({
      id: new Uuid(id),
      email: new Email(email),
      username: new Username(username),
      ...(password !== undefined && { password: new PasswordHash(password) }),
      emailValidated,
      ...(authMethods !== undefined && {
        authMethods: authMethods.map((method) =>
          UserAuthMethod.fromPrimitives(method)
        )
      }),
      roles: new UserRoles(roles),
      metadata: Metadata.fromPrimitives(metadata)
    });
  }

  findAuthMethod(
    provider: UserAuthMethodPrimitives['provider']
  ): UserAuthMethod | undefined {
    return this.authMethods.find((method) => method.provider === provider);
  }

  private static normalizeAuthMethods({
    authMethods,
    password,
    linkedAt
  }: {
    authMethods?: UserAuthMethod[];
    password?: PasswordHash;
    linkedAt: Date;
  }): UserAuthMethod[] {
    const methods = authMethods ? [...authMethods] : [];

    if (password !== undefined) {
      const localMethodIndex = methods.findIndex((method) => method.isLocal());
      const localMethod = UserAuthMethod.local(password, linkedAt);

      if (localMethodIndex >= 0) {
        methods[localMethodIndex] = localMethod;
      } else {
        methods.push(localMethod);
      }
    }

    return methods;
  }
}
