import { expect, jest } from '@jest/globals';
import type {
  GithubIdentity,
  GithubIdentityProviderTool
} from '../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';

export class GithubIdentityProviderMock implements GithubIdentityProviderTool {
  private readonly fetchIdentityMock: jest.Mock<
    (code: string, codeVerifier: string) => Promise<Nullable<GithubIdentity>>
  >;

  constructor(identity: Nullable<GithubIdentity> = null) {
    this.fetchIdentityMock = jest
      .fn<
        (
          code: string,
          codeVerifier: string
        ) => Promise<Nullable<GithubIdentity>>
      >()
      .mockResolvedValue(identity);
  }

  fetchIdentity(
    code: string,
    codeVerifier: string
  ): Promise<Nullable<GithubIdentity>> {
    return this.fetchIdentityMock(code, codeVerifier);
  }

  setIdentity(identity: Nullable<GithubIdentity>): void {
    this.fetchIdentityMock.mockResolvedValue(identity);
  }

  /** The next calls reject with `error` (e.g. GitHub is unreachable). */
  setFailure(error: Error): void {
    this.fetchIdentityMock.mockRejectedValue(error);
  }

  assertFetchIdentityHasBeenCalledWith(
    code: string,
    codeVerifier: string
  ): void {
    expect(this.fetchIdentityMock).toHaveBeenCalledWith(code, codeVerifier);
  }
}
