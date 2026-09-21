import { v4 as uuidv4 } from 'uuid';
import { InvalidArgumentException } from '../errors/InvalidArgumentException.js';
import { UuidValidator } from './UuidValidator.js';

export function createIdGenerator<T extends string>(entityName: string) {
  return {
    create(value: string): T {
      if (!UuidValidator.isValid(value)) {
        throw new InvalidArgumentException(
          `${entityName} <${value}> is not a valid UUID v4`
        );
      }
      return value as T;
    },
    random(): T {
      return uuidv4() as T;
    }
  };
}
