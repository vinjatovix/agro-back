import { DomainException } from './DomainException.js';

export class InvalidArgumentException extends DomainException {
  constructor(message = 'Invalid Argument', errors?: Record<string, string>) {
    super(message, errors);
  }
}
