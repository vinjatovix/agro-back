import { DomainException } from './DomainException.js';

export class DomainServiceUnavailableException extends DomainException {
  constructor(
    message = 'Service unavailable',
    errors?: Record<string, string>
  ) {
    super(message, errors);
  }
}
