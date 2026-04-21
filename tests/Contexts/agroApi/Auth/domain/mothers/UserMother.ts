import type { RegisterUserRequest } from '../../../../../../src/Contexts/agroApi/Auth/application/index.js';
import {
  UserAuthMethod,
  User,
  UserPatch,
  Username,
  type UserRoles
} from '../../../../../../src/Contexts/agroApi/Auth/domain/index.js';
import {
  Email,
  Metadata,
  PasswordHash,
  Uuid
} from '../../../../../../src/Contexts/shared/domain/valueObject/index.js';

import { EmailMother } from '../../../../shared/domain/mothers/EmailMother.js';
import { random, UuidMother } from '../../../../shared/fixtures/index.js';
import { UserRolesMother } from './UserRolesMother.js';

export class UserMother {
  static create({
    id,
    email,
    username,
    password,
    emailValidated,
    authMethods,
    roles,
    metadata
  }: {
    id?: Uuid;
    email?: Email;
    username?: Username;
    password?: PasswordHash;
    emailValidated?: boolean;
    authMethods?: UserAuthMethod[];
    roles?: UserRoles;
    metadata?: Metadata;
  } = {}): User {
    const user = username ?? new Username(random.word({ min: 4, max: 20 }));
    return new User({
      id: id ?? Uuid.random(),
      email: email ?? EmailMother.random(),
      username: user,
      password: password ?? UserMother.randomPasswordHash(),
      ...(authMethods !== undefined && { authMethods }),
      emailValidated: emailValidated ?? random.boolean(),
      roles:
        roles ??
        UserRolesMother.create([
          random.arrayElement(['admin', 'user'] as string[]) as string
        ]),
      metadata: metadata ?? Metadata.create(user.value)
    });
  }

  static from(command: RegisterUserRequest): User {
    return this.create({
      email: new Email(command.email),
      username: new Username(command.username),
      password: UserMother.randomPasswordHash()
    });
  }

  static random(id?: string): User {
    return (
      (id && this.create({ id: new Uuid(id) })) ||
      this.create({ id: UuidMother.random() })
    );
  }

  static randomPatch(id: string): UserPatch {
    return new UserPatch({
      id: new Uuid(id),
      password: UserMother.randomPasswordHash(),
      emailValidated: random.boolean(),
      roles: UserRolesMother.random()
    });
  }

  static randomPasswordHash(): PasswordHash {
    return new PasswordHash(`$2b$10$${'a'.repeat(53)}`);
  }

  static randomGoogleAuthMethod(
    providerUserId: string = random.guid()
  ): UserAuthMethod {
    return new UserAuthMethod({
      provider: 'google',
      providerUserId,
      linkedAt: new Date()
    });
  }
}
