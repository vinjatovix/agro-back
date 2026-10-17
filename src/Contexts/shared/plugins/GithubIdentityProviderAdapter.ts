import type { Nullable } from '../../../shared/domain/types/Nullable.js';
import { isRecord } from '../../../shared/domain/utils/isRecord.js';
import { DomainServiceUnavailableException } from '../domain/errors/index.js';
import {
  GITHUB_TIMEOUT_MS,
  GITHUB_UNAVAILABLE_MESSAGE,
  type GithubIdentity,
  type GithubIdentityProviderTool
} from './GithubIdentityProviderTool.js';
import { buildLogger } from './logger.plugin.js';

const logger = buildLogger('githubIdentityProvider');

const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const USER_EMAILS_URL = 'https://api.github.com/user/emails';

const GITHUB_API_ACCEPT = 'application/vnd.github+json';
// GitHub requires a User-Agent on every API call; the app name is enough.
const USER_AGENT = 'agro-api';

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR_FLOOR = 500;

export type GithubIdentityProviderAdapterDependencies = {
  githubClientId: string;
  githubClientSecret: string;
  githubRedirectUri: string;
};

/** Name and code of a failure, never its message (it may hold the code). */
const describeError = (error: unknown): { name: string; code?: unknown } => {
  if (!(error instanceof Error)) return { name: typeof error };

  return 'code' in error
    ? { name: error.name, code: error.code }
    : { name: error.name };
};

/** A GitHub response already read within the bounded request. */
type GithubResponse = {
  status: number;
  headers: Headers;
  body: unknown;
};

/**
 * A server-error, rate-limit or secondary-rate-limit response: GitHub is
 * unavailable, not rejecting the sign-in.
 */
const isUnavailable = (
  response: Pick<GithubResponse, 'status' | 'headers'>
): boolean => {
  if (response.status >= SERVER_ERROR_FLOOR) return true;
  if (response.status === TOO_MANY_REQUESTS) return true;

  return (
    response.status === FORBIDDEN &&
    (response.headers.get('retry-after') !== null ||
      response.headers.get('x-ratelimit-remaining') === '0')
  );
};

const readAccessToken = (body: unknown): Nullable<string> => {
  if (!isRecord(body)) return null;
  // The OAuth `200` + `error` quirk: a rejected code answers `200` with an
  // `error` field instead of an access token.
  if (body.error !== undefined) return null;

  return typeof body.access_token === 'string' ? body.access_token : null;
};

const readUserId = (body: unknown): Nullable<string> =>
  isRecord(body) && typeof body.id === 'number' ? String(body.id) : null;

const readPrimaryVerifiedEmail = (body: unknown): Nullable<string> => {
  if (!Array.isArray(body)) return null;

  const entries = body as unknown[];
  const match = entries.find(
    (entry) =>
      isRecord(entry) &&
      entry.primary === true &&
      entry.verified === true &&
      typeof entry.email === 'string'
  );

  return isRecord(match) && typeof match.email === 'string'
    ? match.email
    : null;
};

/**
 * Exchanges a GitHub authorization code (with its PKCE verifier) server-side
 * and reads the person's numeric id and primary verified email. The access
 * token lives only as a local variable here: it is used to read the identity
 * and then discarded, never stored or returned. A rejected code/verifier or an
 * identity with no primary verified email answers `null` (the use case maps it
 * to the uniform `401`); an unreachable, erroring or rate-limiting GitHub
 * throws `DomainServiceUnavailableException` (`503`).
 */
export class GithubIdentityProviderAdapter implements GithubIdentityProviderTool {
  private readonly githubClientId: string;
  private readonly githubClientSecret: string;
  private readonly githubRedirectUri: string;

  constructor({
    githubClientId,
    githubClientSecret,
    githubRedirectUri
  }: GithubIdentityProviderAdapterDependencies) {
    this.githubClientId = githubClientId;
    this.githubClientSecret = githubClientSecret;
    this.githubRedirectUri = githubRedirectUri;
  }

  async fetchIdentity(
    code: string,
    codeVerifier: string
  ): Promise<Nullable<GithubIdentity>> {
    const accessToken = await this.exchangeCode(code, codeVerifier);
    if (!accessToken) return null;

    const userId = await this.fetchUserId(accessToken);
    if (!userId) return null;

    const email = await this.fetchPrimaryVerifiedEmail(accessToken);
    if (!email) return null;

    return { userId, email };
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string
  ): Promise<Nullable<string>> {
    const response = await this.send(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify({
        client_id: this.githubClientId,
        client_secret: this.githubClientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.githubRedirectUri
      })
    });

    if (isUnavailable(response)) {
      this.failUnavailable('GitHub code exchange failed', response.status);
    }

    return readAccessToken(response.body);
  }

  private async fetchUserId(accessToken: string): Promise<Nullable<string>> {
    const response = await this.send(USER_URL, {
      headers: this.identityHeaders(accessToken)
    });

    if (response.status === UNAUTHORIZED) return null;
    if (isUnavailable(response)) {
      this.failUnavailable('GitHub identity read failed', response.status);
    }

    return readUserId(response.body);
  }

  private async fetchPrimaryVerifiedEmail(
    accessToken: string
  ): Promise<Nullable<string>> {
    const response = await this.send(USER_EMAILS_URL, {
      headers: this.identityHeaders(accessToken)
    });

    if (response.status === UNAUTHORIZED) return null;
    if (isUnavailable(response)) {
      this.failUnavailable('GitHub email read failed', response.status);
    }

    return readPrimaryVerifiedEmail(response.body);
  }

  private identityHeaders(accessToken: string): Record<string, string> {
    return {
      Accept: GITHUB_API_ACCEPT,
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT
    };
  }

  /**
   * A bounded request: the fetch and the body read share one 5 s timeout, so a
   * response that stalls its body past the deadline is an outage (`503`) too, as
   * much as a slow or failing connection. A network error, timeout or invalid
   * JSON all surface as the same unavailability.
   */
  private async send(url: string, init: RequestInit): Promise<GithubResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      return {
        status: response.status,
        headers: response.headers,
        body: await response.json()
      };
    } catch (error: unknown) {
      logger.error('GitHub request failed', describeError(error));
      throw new DomainServiceUnavailableException(GITHUB_UNAVAILABLE_MESSAGE);
    } finally {
      clearTimeout(timer);
    }
  }

  private failUnavailable(message: string, status: number): never {
    logger.error(message, { status });
    throw new DomainServiceUnavailableException(GITHUB_UNAVAILABLE_MESSAGE);
  }
}
