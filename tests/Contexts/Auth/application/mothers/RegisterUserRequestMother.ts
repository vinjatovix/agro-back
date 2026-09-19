import type { RegisterUserRequest } from '../../../../../src/Contexts/Auth/application/index.js';
import { PlainPassword } from '../../../../../src/Contexts/Auth/domain/value-objects/PlainPassword.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import {
  Email,
  Uuid
} from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random, UuidMother } from '../../../shared/fixtures/index.js';

export class RegisterUserRequestMother {
  static create(
    id: Uuid,
    email: Email,
    username: Username,
    password: PlainPassword
  ): RegisterUserRequest {
    return {
      id: id.value,
      email: email.value,
      username: username.value,
      password: password.value
    };
  }

  static random(id?: string): RegisterUserRequest {
    return this.create(
      (id && UuidMother.create(id)) || UuidMother.random(),
      EmailMother.random(),
      new Username(
        random.word({ min: Username.MIN_LENGTH, max: Username.MAX_LENGTH })
      ),
      new PlainPassword('%aD3f3s.0%')
    );
  }
}
