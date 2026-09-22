import { validate as validateUuid, version as uuidVersion } from 'uuid';

export class UuidValidator {
  public static isValid(id: string): boolean {
    return validateUuid(id.trim());
  }

  public static isValidV4(id: string): boolean {
    const trimmed = id.trim();
    return validateUuid(trimmed) && uuidVersion(trimmed) === 4;
  }

  public static isValidV7(id: string): boolean {
    const trimmed = id.trim();
    return validateUuid(trimmed) && uuidVersion(trimmed) === 7;
  }
}
