import { DomainException } from './DomainException.js';

export class DomainForbiddenException extends DomainException {
  constructor(message = 'Forbidden', errors?: Record<string, string>) {
    super(message, errors);
  }
}
