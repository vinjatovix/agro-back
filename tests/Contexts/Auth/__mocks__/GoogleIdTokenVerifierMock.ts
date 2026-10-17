import { expect, jest } from '@jest/globals';
import type {
  GoogleIdTokenPayload,
  GoogleIdTokenVerifierTool
} from '../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';

export class GoogleIdTokenVerifierMock implements GoogleIdTokenVerifierTool {
  private readonly verifyIdTokenMock: jest.Mock<
    (idToken: string) => Promise<Nullable<GoogleIdTokenPayload>>
  >;

  constructor(payload: Nullable<GoogleIdTokenPayload> = null) {
    this.verifyIdTokenMock = jest
      .fn<(idToken: string) => Promise<Nullable<GoogleIdTokenPayload>>>()
      .mockResolvedValue(payload);
  }

  verifyIdToken(idToken: string): Promise<Nullable<GoogleIdTokenPayload>> {
    return this.verifyIdTokenMock(idToken);
  }

  setPayload(payload: Nullable<GoogleIdTokenPayload>): void {
    this.verifyIdTokenMock.mockResolvedValue(payload);
  }

  /** The next checks reject with `error` (e.g. Google is unreachable). */
  setFailure(error: Error): void {
    this.verifyIdTokenMock.mockRejectedValue(error);
  }

  assertVerifyIdTokenHasBeenCalledWith(expected: string): void {
    expect(this.verifyIdTokenMock).toHaveBeenCalledWith(expected);
  }
}
