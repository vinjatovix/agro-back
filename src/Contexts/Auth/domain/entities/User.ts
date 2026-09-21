import { AggregateRoot } from '../../../shared/domain/entities/AggregateRoot.js';
import type { Serializable } from '../../../shared/domain/interfaces/Serializable.js';
import type { MetadataPrimitives } from '../../../shared/domain/MetadataPrimitives.js';
import { Email, Metadata } from '../../../shared/domain/valueObject/index.js';
import { createUserId, type UserId } from '../UserId.js';
import {
  PasswordHash,
  UserAuthMethod,
  Username,
  UserRoles
} from '../value-objects/index.js';
import type { UserAuthMethodPrimitives } from '../value-objects/types/index.js';
import type { UserPrimitives } from './types/UserPrimitives.js';

export class User
  extends AggregateRoot<UserId>
  implements Serializable<UserPrimitives>
{
  readonly id: UserId;
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
    id: UserId;
    email: Email;
    username: Username;
    password?: PasswordHash;
    emailValidated: boolean;
    authMethods?: UserAuthMethod[];
    roles: UserRoles;
    metadata: Metadata;
  }) {
    super(id);
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

  toPrimitives(): UserPrimitives {
    return {
      id: this.id,
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
    metadata: MetadataPrimitives;
  }): User {
    return new User({
      id: createUserId(id),
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
