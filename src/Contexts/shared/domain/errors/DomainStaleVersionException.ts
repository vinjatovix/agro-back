import { DomainException } from './DomainException.js';

export class DomainStaleVersionException extends DomainException {
  constructor(message = 'Stale version', errors?: Record<string, string>) {
    super(message, errors);
  }
}
