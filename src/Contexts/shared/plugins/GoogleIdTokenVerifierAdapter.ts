import {
  type Certificates,
  OAuth2Client,
  type TokenPayload
} from 'google-auth-library';
import type { Nullable } from '../../../shared/domain/types/Nullable.js';
import { DomainServiceUnavailableException } from '../domain/errors/index.js';
import {
  GOOGLE_UNAVAILABLE_MESSAGE,
  type GoogleIdTokenPayload,
  type GoogleIdTokenVerifierTool
} from './GoogleIdTokenVerifierTool.js';
import { buildLogger } from './logger.plugin.js';

const logger = buildLogger('googleIdTokenVerifier');

const GOOGLE_CERTS_TIMEOUT_MS = 5_000;
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

export type GoogleIdTokenVerifierAdapterDependencies = {
  googleClientId: string;
};

/** Name and code of a failure, never its message (it may hold the token). */
const describeError = (error: unknown): { name: string; code?: unknown } => {
  if (!(error instanceof Error)) return { name: typeof error };

  return 'code' in error
    ? { name: error.name, code: error.code }
    : { name: error.name };
};

/**
 * Checks Google ID tokens against Google's public keys, for the single
 * configured web client id. Fetching the keys and checking the token are two
 * steps so an outage (`503`) is never confused with a rejected token.
 */
export class GoogleIdTokenVerifierAdapter implements GoogleIdTokenVerifierTool {
  private readonly googleClientId: string;
  private readonly client: OAuth2Client;

  constructor({ googleClientId }: GoogleIdTokenVerifierAdapterDependencies) {
    this.googleClientId = googleClientId;
    this.client = new OAuth2Client({
      clientId: googleClientId,
      transporterOptions: { timeout: GOOGLE_CERTS_TIMEOUT_MS }
    });
  }

  async verifyIdToken(
    idToken: string
  ): Promise<Nullable<GoogleIdTokenPayload>> {
    const certs = await this.fetchCerts();

    return this.checkToken(idToken, certs);
  }

  /** Keys are cached by the library following Google's `Cache-Control`. */
  private async fetchCerts(): Promise<Certificates> {
    try {
      const { certs } = await this.client.getFederatedSignonCertsAsync();
      return certs;
    } catch (error: unknown) {
      logger.error(
        'Google public keys could not be fetched',
        describeError(error)
      );
      throw new DomainServiceUnavailableException(GOOGLE_UNAVAILABLE_MESSAGE);
    }
  }

  private async checkToken(
    idToken: string,
    certs: Certificates
  ): Promise<Nullable<GoogleIdTokenPayload>> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        idToken,
        certs,
        this.googleClientId,
        GOOGLE_ISSUERS
      );
      payload = ticket.getPayload();
    } catch {
      // Fixed text: the library's messages can include the decoded payload.
      logger.warn('Google token rejected');
      return null;
    }

    if (!payload?.sub || !payload.email) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      ...(payload.name !== undefined && { name: payload.name })
    };
  }
}
