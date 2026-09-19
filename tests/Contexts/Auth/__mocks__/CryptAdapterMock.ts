import type { CryptAdapter } from '../../../../src/Contexts/shared/plugins/CryptAdapter.js';
import { jest, expect } from '@jest/globals';
import { random } from '../../shared/fixtures/index.js';
import { EmailMother } from '../../shared/domain/mothers/EmailMother.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../src/shared/domain/types/UnknownRecord.js';

interface Options {
  login?: boolean;
  token?: boolean;
  refresh?: boolean;
}

const DEFAULT_OPTIONS: Options = {
  login: false,
  token: false,
  refresh: true
};

export class CryptAdapterMock implements CryptAdapter {
  private readonly hashMock: jest.Mock<(password: string) => string>;
  private readonly compareMock: jest.Mock<
    (value: string, encryptedValue: string) => boolean
  >;
  private readonly generateTokenMock: jest.Mock<
    (payload: UnknownRecord, duration?: string) => Promise<Nullable<string>>
  >;
  private readonly verifyTokenMock: jest.Mock<
    (token: string) => Promise<Nullable<UnknownRecord>>
  >;
  private readonly refreshTokenMock: jest.Mock<
    (token: string) => Promise<Nullable<string>>
  >;

  constructor({ login, token, refresh }: Options = DEFAULT_OPTIONS) {
    this.hashMock = jest
      .fn<(password: string) => string>()
      .mockReturnValue(
        '$2a$12$mZgfH4D7z4dZcZHDKyogqOOnEWS6XHLdczPJktzD88djpvlr3Bq1C'
      );
    this.compareMock = jest
      .fn<(value: string, encryptedValue: string) => boolean>()
      .mockReturnValue(login ?? false);
    this.generateTokenMock = jest
      .fn<
        (payload: UnknownRecord, duration?: string) => Promise<Nullable<string>>
      >()
      .mockResolvedValue(random.word());
    this.verifyTokenMock = token
      ? jest
          .fn<(token: string) => Promise<Nullable<UnknownRecord>>>()
          .mockResolvedValue({ email: EmailMother.random().value })
      : jest
          .fn<(token: string) => Promise<Nullable<UnknownRecord>>>()
          .mockResolvedValue(null);
    this.refreshTokenMock = jest
      .fn<(token: string) => Promise<Nullable<string>>>()
      .mockResolvedValue(refresh === false ? null : random.word());
  }

  hash(password: string): string {
    return this.hashMock(password);
  }

  assertHashHasBeenCalledWith(expected: string): void {
    expect(this.hashMock).toHaveBeenCalledWith(expected);
  }

  compare(value: string, encryptedValue: string): boolean {
    return this.compareMock(value, encryptedValue);
  }

  assertCompareHasBeenCalledWith(
    expectedValue: string,
    expectedEncryptedValue: string
  ): void {
    expect(this.compareMock).toHaveBeenCalledWith(
      expectedValue,
      expectedEncryptedValue
    );
  }

  generateToken(
    payload: UnknownRecord,
    duration?: string
  ): Promise<Nullable<string>> {
    return this.generateTokenMock(payload, duration);
  }
  verifyToken(token: string): Promise<Nullable<UnknownRecord>> {
    return this.verifyTokenMock(token);
  }

  assertVerifyTokenHasBeenCalledWith(expected: string): void {
    expect(this.verifyTokenMock).toHaveBeenCalledWith(expected);
  }

  refreshToken(token: string): Promise<Nullable<string>> {
    return this.refreshTokenMock(token);
  }

  assertRefreshTokenHasBeenCalledWith(expected: string): void {
    expect(this.refreshTokenMock).toHaveBeenCalledWith(expected);
  }
}
