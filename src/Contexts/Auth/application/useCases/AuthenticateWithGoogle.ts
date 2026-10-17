import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { GoogleIdTokenVerifierTool } from '../../../shared/plugins/index.js';
import type { AuthenticateWithGoogleRequest } from '../interfaces/index.js';
import type { ProviderUserResolver } from '../services/ProviderUserResolver.js';
import type { SessionTokenIssuer } from '../services/SessionTokenIssuer.js';

const INVALID_GOOGLE_TOKEN_MESSAGE = 'Invalid Google token';

export type AuthenticateWithGoogleDependencies = {
  googleIdTokenVerifier: GoogleIdTokenVerifierTool;
  providerUserResolver: ProviderUserResolver;
  sessionTokenIssuer: SessionTokenIssuer;
};

export class AuthenticateWithGoogle {
  private readonly googleIdTokenVerifier: GoogleIdTokenVerifierTool;
  private readonly providerUserResolver: ProviderUserResolver;
  private readonly sessionTokenIssuer: SessionTokenIssuer;

  constructor({
    googleIdTokenVerifier,
    providerUserResolver,
    sessionTokenIssuer
  }: AuthenticateWithGoogleDependencies) {
    this.googleIdTokenVerifier = googleIdTokenVerifier;
    this.providerUserResolver = providerUserResolver;
    this.sessionTokenIssuer = sessionTokenIssuer;
  }

  async run({ idToken }: AuthenticateWithGoogleRequest): Promise<string> {
    const tokenPayload =
      await this.googleIdTokenVerifier.verifyIdToken(idToken);

    if (!tokenPayload?.email || !tokenPayload?.sub) {
      throw new DomainUnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    if (!tokenPayload.emailVerified) {
      throw new DomainUnauthorizedException(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    const user = await this.providerUserResolver.resolve({
      provider: 'google',
      providerUserId: tokenPayload.sub,
      email: tokenPayload.email,
      invalidAuthorizationMessage: INVALID_GOOGLE_TOKEN_MESSAGE
    });

    return this.sessionTokenIssuer.issue(user);
  }
}
