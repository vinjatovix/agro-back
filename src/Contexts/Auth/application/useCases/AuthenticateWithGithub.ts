import { DomainUnauthorizedException } from '../../../shared/domain/errors/index.js';
import type { GithubIdentityProviderTool } from '../../../shared/plugins/index.js';
import type { AuthenticateWithGithubRequest } from '../interfaces/index.js';
import type { ProviderUserResolver } from '../services/ProviderUserResolver.js';
import type { SessionTokenIssuer } from '../services/SessionTokenIssuer.js';

const INVALID_GITHUB_AUTHORIZATION_MESSAGE = 'Invalid GitHub authorization';

export type AuthenticateWithGithubDependencies = {
  githubIdentityProvider: GithubIdentityProviderTool;
  providerUserResolver: ProviderUserResolver;
  sessionTokenIssuer: SessionTokenIssuer;
};

export class AuthenticateWithGithub {
  private readonly githubIdentityProvider: GithubIdentityProviderTool;
  private readonly providerUserResolver: ProviderUserResolver;
  private readonly sessionTokenIssuer: SessionTokenIssuer;

  constructor({
    githubIdentityProvider,
    providerUserResolver,
    sessionTokenIssuer
  }: AuthenticateWithGithubDependencies) {
    this.githubIdentityProvider = githubIdentityProvider;
    this.providerUserResolver = providerUserResolver;
    this.sessionTokenIssuer = sessionTokenIssuer;
  }

  async run({
    code,
    codeVerifier
  }: AuthenticateWithGithubRequest): Promise<string> {
    const identity = await this.githubIdentityProvider.fetchIdentity(
      code,
      codeVerifier
    );

    if (!identity) {
      throw new DomainUnauthorizedException(
        INVALID_GITHUB_AUTHORIZATION_MESSAGE
      );
    }

    const user = await this.providerUserResolver.resolve({
      provider: 'github',
      providerUserId: identity.userId,
      email: identity.email,
      invalidAuthorizationMessage: INVALID_GITHUB_AUTHORIZATION_MESSAGE
    });

    return this.sessionTokenIssuer.issue(user);
  }
}
