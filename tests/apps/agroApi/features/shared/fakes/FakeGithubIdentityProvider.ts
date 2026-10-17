import { DomainServiceUnavailableException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  GITHUB_UNAVAILABLE_MESSAGE,
  type GithubIdentity,
  type GithubIdentityProviderTool
} from '../../../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../../../src/shared/domain/types/Nullable.js';

const TEST_CODE_PREFIX = 'test-github';
/** Code that behaves as if GitHub could not be reached. */
export const UNAVAILABLE_TEST_CODE = 'test-github-unavailable';
/** Code GitHub rejects (bad/expired/reused code or verifier). */
export const REJECTED_TEST_CODE = 'test-github-rejected';
/** Code whose identity has no email that is both primary and verified. */
export const NO_VERIFIED_EMAIL_TEST_CODE = 'test-github-no-verified-email';

/** Builds the code a scenario drives for a `(userId, email)` identity. */
export const githubCodeFor = (userId: string, email: string): string =>
  `${TEST_CODE_PREFIX}|${userId}|${encodeURIComponent(email)}`;

/**
 * Acceptance-test GitHub provider, registered through the container
 * `overrides`. Maps a `code` to a deterministic outcome so scenarios drive the
 * flow without GitHub:
 * - `test-github|<userId>|<urlEncodedEmail>` → that identity;
 * - the reserved "unavailable" code → rejects with
 *   `DomainServiceUnavailableException` (→ `503`);
 * - any other code (rejected, no primary verified email) → `null` (→ `401`).
 * The `codeVerifier` is accepted and ignored, mirroring the real PKCE flow.
 */
export class FakeGithubIdentityProvider implements GithubIdentityProviderTool {
  fetchIdentity(
    code: string,
    _codeVerifier: string
  ): Promise<Nullable<GithubIdentity>> {
    if (code === UNAVAILABLE_TEST_CODE) {
      return Promise.reject(
        new DomainServiceUnavailableException(GITHUB_UNAVAILABLE_MESSAGE)
      );
    }

    return Promise.resolve(this.parse(code));
  }

  private parse(code: string): Nullable<GithubIdentity> {
    const [prefix, userId, encodedEmail] = code.split('|');

    if (prefix !== TEST_CODE_PREFIX || !userId || !encodedEmail) {
      return null;
    }

    return { userId, email: decodeURIComponent(encodedEmail) };
  }
}
