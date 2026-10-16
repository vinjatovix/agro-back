import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';

export const INVALID_EMAIL_TOKEN_MESSAGE = 'Invalid or expired token';

/**
 * One answer for every email token that cannot be used (unknown, expired,
 * already used, replaced or of another purpose), so it reveals nothing about
 * the account. Carries no field details.
 */
export class InvalidEmailTokenException extends InvalidArgumentException {
  constructor() {
    super(INVALID_EMAIL_TOKEN_MESSAGE);
  }
}
