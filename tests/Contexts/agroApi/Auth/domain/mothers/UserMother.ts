import type { RegisterUserRequest } from '../../../../../../src/Contexts/agroApi/Auth/application/index.js';
import {
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
import { UuidMother } from '../../fixtures/shared/domain/mothers/UuidMother.js';
import { random } from '../../fixtures/shared/index.js';
import { UserRolesMother } from './UserRolesMother.js';

export class UserMother {
  static create({
    id,
    email,
    username,
    password,
    emailValidated,
    roles,
    metadata
  }: {
    id?: Uuid;
    email?: Email;
    username?: Username;
    password?: PasswordHash;
    emailValidated?: boolean;
    roles?: UserRoles;
    metadata?: Metadata;
  } = {}): User {
    const user = username ?? new Username(random.word({ min: 4, max: 20 }));
    return new User({
      id: id ?? Uuid.random(),
      email: email ?? EmailMother.random(),
      username: user,
      password: password ?? UserMother.randomPasswordHash(),
      emailValidated: emailValidated ?? random.boolean(),
      roles:
        roles ??
        UserRolesMother.create([`${random.arrayElement(['admin', 'user'])}`]),
      metadata:
        metadata ??
        new Metadata({
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.value,
          updatedBy: user.value
        })
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
}
