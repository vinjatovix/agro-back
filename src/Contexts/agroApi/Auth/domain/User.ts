import { AggregateRoot } from '../../../shared/domain/AggregateRoot.js';
import { Email, Metadata, PasswordHash, Uuid } from '../../../shared/domain/valueObject/index.js';
import type { MetadataType } from '../../../shared/infrastructure/persistence/mongo/types/MetadataType.js';
import { Username } from './Username.js';
import { UserRoles } from './UserRoles.js';

export class User extends AggregateRoot {
  readonly id: Uuid;
  readonly email: Email;
  readonly username: Username;
  readonly password: PasswordHash;
  readonly emailValidated: boolean;
  readonly roles: UserRoles;
  readonly metadata: Metadata;

  constructor({
    id,
    email,
    username,
    password,
    emailValidated,
    roles,
    metadata
  }: {
    id: Uuid;
    email: Email;
    username: Username;
    password: PasswordHash;
    emailValidated: boolean;
    roles: UserRoles;
    metadata: Metadata;
  }) {
    super();
    this.id = id;
    this.email = email;
    this.username = username;
    this.password = password;
    this.emailValidated = emailValidated;
    this.roles = roles;
    this.metadata = metadata;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      id: this.id.value,
      email: this.email.value,
      username: this.username.value,
      password: this.password.value,
      emailValidated: this.emailValidated,
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
    roles,
    metadata
  }: {
    id: string;
    email: string;
    username: string;
    password: string;
    emailValidated: boolean;
    roles: string[];
    metadata: MetadataType;
  }): User {
    return new User({
      id: new Uuid(id),
      email: new Email(email),
      username: new Username(username),
      password: new PasswordHash(password),
      emailValidated,
      roles: new UserRoles(roles),
      metadata: Metadata.fromPrimitives(metadata)
    });
  }
}
