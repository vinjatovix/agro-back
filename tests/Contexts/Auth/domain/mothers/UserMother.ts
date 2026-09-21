import type { RegisterUserRequest } from '../../../../../src/Contexts/Auth/application/index.js';
import { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import { UserPatch } from '../../../../../src/Contexts/Auth/domain/entities/UserPatch.js';
import {
  createUserId,
  randomUserId,
  type UserId
} from '../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  PasswordHash,
  UserAuthMethod,
  Username,
  type UserRoles
} from '../../../../../src/Contexts/Auth/domain/value-objects/index.js';
import {
  Email,
  Metadata
} from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random } from '../../../shared/fixtures/index.js';
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
    id?: UserId;
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
      id: id ?? randomUserId(),
      email: email ?? EmailMother.random(),
      username: user,
      password: password ?? UserMother.randomPasswordHash(),
      ...(authMethods !== undefined && { authMethods }),
      emailValidated: emailValidated ?? random.boolean(),
      roles:
        roles ??
        UserRolesMother.create([
          random.arrayElement(['admin', 'user'] as string[])
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
    return this.create({ id: createUserId(id ?? random.uuid()) });
  }

  static randomPatch(id: string): UserPatch {
    return new UserPatch({
      id: createUserId(id),
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
