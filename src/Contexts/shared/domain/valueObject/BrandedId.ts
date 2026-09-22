import { v7 as uuidv7 } from 'uuid';
import { InvalidArgumentException } from '../errors/InvalidArgumentException.js';
import { UuidValidator } from './UuidValidator.js';

export interface IdGenerator<T extends string> {
  create(value: string): T;
  random(): T;
}

export function createIdGenerator<T extends string>(
  entityName: string
): IdGenerator<T> {
  return {
    create(value: string): T {
      const trimmedValue = value.trim();
      if (!UuidValidator.isValid(trimmedValue)) {
        throw new InvalidArgumentException(
          `${entityName} <${value}> is not a valid UUID`
        );
      }
      return trimmedValue as T;
    },
    random(): T {
      return uuidv7() as T;
    }
  };
}
