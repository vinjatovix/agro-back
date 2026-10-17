import { DomainServiceUnavailableException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  GOOGLE_UNAVAILABLE_MESSAGE,
  type GoogleIdTokenPayload,
  type GoogleIdTokenVerifierTool
} from '../../../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../../../src/shared/domain/types/Nullable.js';

const TEST_TOKEN_PREFIX = 'test-google';
/** Token that behaves as if Google's public keys could not be fetched. */
export const UNAVAILABLE_TEST_TOKEN = 'test-google-unavailable';

/**
 * Acceptance-test verifier, registered through the container `overrides`.
 * Understands `test-google|<sub>|<urlEncodedEmail>|<emailVerified>|<urlEncodedName>`
 * (`emailVerified` defaults to `true`, the name is optional); any other token
 * answers `null`.
 */
export class FakeGoogleIdTokenVerifier implements GoogleIdTokenVerifierTool {
  verifyIdToken(idToken: string): Promise<Nullable<GoogleIdTokenPayload>> {
    if (idToken === UNAVAILABLE_TEST_TOKEN) {
      return Promise.reject(
        new DomainServiceUnavailableException(GOOGLE_UNAVAILABLE_MESSAGE)
      );
    }

    return Promise.resolve(this.parse(idToken));
  }

  private parse(idToken: string): Nullable<GoogleIdTokenPayload> {
    const [prefix, sub, encodedEmail, emailVerified = 'true', encodedName] =
      idToken.split('|');

    if (prefix !== TEST_TOKEN_PREFIX || !sub || !encodedEmail) {
      return null;
    }

    return {
      sub,
      email: decodeURIComponent(encodedEmail),
      emailVerified: emailVerified === 'true',
      ...(encodedName !== undefined && {
        name: decodeURIComponent(encodedName)
      })
    };
  }
}
