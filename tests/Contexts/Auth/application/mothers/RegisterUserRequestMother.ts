import type { RegisterUserRequest } from '../../../../../src/Contexts/Auth/application/index.js';
import { PlainPassword } from '../../../../../src/Contexts/Auth/domain/value-objects/PlainPassword.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random } from '../../../shared/fixtures/index.js';

export class RegisterUserRequestMother {
  static create(
    id: string,
    email: Email,
    username: Username,
    password: PlainPassword
  ): RegisterUserRequest {
    return {
      id,
      email: email.value,
      username: username.value,
      password: password.value
    };
  }

  static random(id?: string): RegisterUserRequest {
    return this.create(
      id ?? random.uuid(),
      EmailMother.random(),
      new Username(
        random.word({ min: Username.MIN_LENGTH, max: Username.MAX_LENGTH })
      ),
      new PlainPassword('%aD3f3s.0%')
    );
  }
}
