import type { Email } from '../../../shared/domain/valueObject/index.js';
import type { AuthProvider } from '../../domain/value-objects/types/index.js';

/**
 * Account notices. Each call builds the message at once and sends it in the
 * background: callers never wait for the mailer and never see its failures.
 */
export interface AccountNotifier {
  activation(email: Email, token: string): void;
  registrationAttempt(email: Email): void;
  providerLinked(email: Email, provider: AuthProvider, at: Date): void;
}
