import { jest } from '@jest/globals';

import { DomainServiceUnavailableException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import {
  GITHUB_UNAVAILABLE_MESSAGE,
  GithubIdentityProviderAdapter
} from '../../../../src/Contexts/shared/plugins/index.js';

type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

const SETTINGS = {
  githubClientId: 'client-id',
  githubClientSecret: 'client-secret',
  githubRedirectUri: 'http://localhost:5173/auth/github/callback'
};

const CODE = 'authorization-code';
const CODE_VERIFIER = 'pkce-verifier';
const ACCESS_TOKEN = 'gho_secret-access-token';

const jsonResponse = (
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers }
  });

describe('GithubIdentityProviderAdapter', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: jest.Mock<FetchFn>;
  let adapter: GithubIdentityProviderAdapter;

  beforeEach(() => {
    fetchMock = jest.fn<FetchFn>();
    globalThis.fetch = fetchMock;
    adapter = new GithubIdentityProviderAdapter(SETTINGS);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /** Queues the exchange, the user read and the emails read, in call order. */
  const queueHappyPath = (id: number, email: string): void => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: ACCESS_TOKEN }))
      .mockResolvedValueOnce(jsonResponse({ id }))
      .mockResolvedValueOnce(
        jsonResponse([
          { email: 'secondary@aa.com', primary: false, verified: true },
          { email, primary: true, verified: true }
        ])
      );
  };

  it('should exchange the code and return the numeric id and the primary verified email', async () => {
    queueHappyPath(1234567, 'github.user@aa.com');

    const identity = await adapter.fetchIdentity(CODE, CODE_VERIFIER);

    expect(identity).toEqual({
      userId: '1234567',
      email: 'github.user@aa.com'
    });
  });

  it('should send the code and verifier to the token exchange and bear the access token on the identity reads', async () => {
    queueHappyPath(42, 'primary@aa.com');

    await adapter.fetchIdentity(CODE, CODE_VERIFIER);

    const [exchangeUrl, exchangeInit] = fetchMock.mock.calls[0] ?? [];
    expect(exchangeUrl).toBe('https://github.com/login/oauth/access_token');
    const exchangeBody = exchangeInit?.body;
    expect(typeof exchangeBody).toBe('string');
    const bodyText = exchangeBody as string;
    expect(bodyText).toContain(CODE);
    expect(bodyText).toContain(CODE_VERIFIER);

    const [, userInit] = fetchMock.mock.calls[1] ?? [];
    const userHeaders = userInit?.headers as Record<string, string>;
    expect(userHeaders.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('should never surface the access token in the returned identity', async () => {
    queueHappyPath(7, 'primary@aa.com');

    const identity = await adapter.fetchIdentity(CODE, CODE_VERIFIER);

    expect(JSON.stringify(identity)).not.toContain(ACCESS_TOKEN);
  });

  describe('rejections (→ null → 401)', () => {
    it('should answer null when the exchange returns a 200 error body', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: 'bad_verification_code' })
      );

      const identity = await adapter.fetchIdentity(CODE, CODE_VERIFIER);

      expect(identity).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should answer null when the identity read is unauthorized', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: ACCESS_TOKEN }))
        .mockResolvedValueOnce(jsonResponse({}, { status: 401 }));

      const identity = await adapter.fetchIdentity(CODE, CODE_VERIFIER);

      expect(identity).toBeNull();
    });

    it('should answer null when no email is both primary and verified', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: ACCESS_TOKEN }))
        .mockResolvedValueOnce(jsonResponse({ id: 55 }))
        .mockResolvedValueOnce(
          jsonResponse([
            { email: 'unverified@aa.com', primary: true, verified: false },
            { email: 'secondary@aa.com', primary: false, verified: true }
          ])
        );

      const identity = await adapter.fetchIdentity(CODE, CODE_VERIFIER);

      expect(identity).toBeNull();
    });
  });

  describe('unavailability (→ 503)', () => {
    const expectUnavailable = async (): Promise<void> => {
      const result = adapter.fetchIdentity(CODE, CODE_VERIFIER);

      await expect(result).rejects.toBeInstanceOf(
        DomainServiceUnavailableException
      );
      await expect(result).rejects.toThrow(GITHUB_UNAVAILABLE_MESSAGE);
      // The failure never leaks the code, verifier or access token.
      await expect(result).rejects.not.toThrow(CODE);
      await expect(result).rejects.not.toThrow(CODE_VERIFIER);
      await expect(result).rejects.not.toThrow(ACCESS_TOKEN);
    };

    it('should throw when the request errors or times out', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      await expectUnavailable();
    });

    it('should throw on a server error from the exchange', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 502 }));

      await expectUnavailable();
    });

    it('should throw when the exchange is rate-limited (429)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 429 }));

      await expectUnavailable();
    });

    it('should throw on a secondary-rate-limit 403 carrying Retry-After', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({}, { status: 403, headers: { 'Retry-After': '60' } })
      );

      await expectUnavailable();
    });

    it('should throw on a secondary-rate-limit 403 with no remaining quota', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ access_token: ACCESS_TOKEN }))
        .mockResolvedValueOnce(
          jsonResponse(
            {},
            { status: 403, headers: { 'x-ratelimit-remaining': '0' } }
          )
        );

      await expectUnavailable();
    });
  });
});
