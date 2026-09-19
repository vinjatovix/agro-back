import { DomainException } from './DomainException.js';

export class DomainNotFoundException extends DomainException {
  constructor(message = 'Not Found', errors?: Record<string, string>) {
    super(message, errors);
  }
}
