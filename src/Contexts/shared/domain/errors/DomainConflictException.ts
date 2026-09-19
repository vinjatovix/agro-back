import { DomainException } from './DomainException.js';

export class DomainConflictException extends DomainException {
  constructor(message = 'Conflict', errors?: Record<string, string>) {
    super(message, errors);
  }
}
