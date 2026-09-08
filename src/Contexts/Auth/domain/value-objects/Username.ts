import { StringValueObject } from '../../../shared/domain/valueObject/StringValueObject.js';

export class Username extends StringValueObject {
  static readonly MIN_LENGTH = 4;
  static readonly MAX_LENGTH = 20;

  constructor(value: string) {
    super(
      Username.ensureLength(value, Username.MIN_LENGTH, Username.MAX_LENGTH)
    );
  }
}
