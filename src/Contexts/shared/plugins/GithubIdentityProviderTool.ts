import type { Nullable } from '../../../shared/domain/types/Nullable.js';

/** Message answered to the client when GitHub cannot be reached (`503`). */
export const GITHUB_UNAVAILABLE_MESSAGE =
  'GitHub sign-in is temporarily unavailable';

/** Bounded timeout for each outbound GitHub call (mirrors Google's 5 s). */
export const GITHUB_TIMEOUT_MS = 5000;

/**
 * The identity read from GitHub after a successful code exchange. The access
 * token obtained during the exchange is never part of it: it stays a local
 * variable inside the adapter and is discarded once the identity is read.
 */
export interface GithubIdentity {
  /** GitHub's stable numeric user id, as a string (never the login name). */
  userId: string;
  /** The one email that is both primary and verified. */
  email: string;
}

export interface GithubIdentityProviderTool {
  /**
   * Exchanges the authorization `code` (with the PKCE `codeVerifier`) and reads
   * the identity. Answers `null` when GitHub rejects the code/verifier or no
   * email is both primary and verified; throws
   * `DomainServiceUnavailableException` when GitHub is unreachable, errors or
   * rate-limits.
   */
  fetchIdentity(
    code: string,
    codeVerifier: string
  ): Promise<Nullable<GithubIdentity>>;
}
