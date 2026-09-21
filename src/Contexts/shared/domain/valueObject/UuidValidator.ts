import { validate as validateUuid } from 'uuid';

export class UuidValidator {
  public static isValid(id: string): boolean {
    return validateUuid(id);
  }
}
