import type { Nullable } from '../../../shared/domain/types/Nullable.js';

/** Answer of a Google sign-in when Google's public keys cannot be fetched. */
export const GOOGLE_UNAVAILABLE_MESSAGE =
  'Google sign-in is temporarily unavailable';

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface GoogleIdTokenVerifierTool {
  /**
   * Answers the payload only when Google signed the token, its issuer is
   * Google, its audience is the configured client id and it has not
   * expired; `null` for any other token. Throws
   * `DomainServiceUnavailableException` when verification cannot run
   * (Google's public keys cannot be fetched).
   */
  verifyIdToken(idToken: string): Promise<Nullable<GoogleIdTokenPayload>>;
}
