import { DomainException } from './DomainException.js';

export class DomainUnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized', errors?: Record<string, string>) {
    super(message, errors);
  }
}
