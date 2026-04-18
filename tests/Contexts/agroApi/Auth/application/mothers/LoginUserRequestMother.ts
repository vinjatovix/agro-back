import type { LoginUserRequest } from '../../../../../../src/Contexts/agroApi/Auth/application/index.js';
import { PlainPassword } from '../../../../../../src/Contexts/agroApi/Auth/domain/PlainPassword.js';
import type { Email } from '../../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { EmailMother } from '../../../../shared/domain/mothers/EmailMother.js';

export class LoginUserRequestMother {
  static create(email: Email, password: PlainPassword): LoginUserRequest {
    return {
      email: email.value,
      password: password.value
    };
  }

  static random(): LoginUserRequest {
    return this.create(EmailMother.random(), new PlainPassword('%aD3f3s.0%'));
  }
}
