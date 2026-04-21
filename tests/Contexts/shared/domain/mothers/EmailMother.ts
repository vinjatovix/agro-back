import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { random } from '../../fixtures/index.js';

export class EmailMother {
  static create(value: string) {
    return new Email(value);
  }

  static random() {
    return this.create(random.email());
  }
}
