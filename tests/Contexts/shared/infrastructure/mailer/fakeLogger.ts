import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/index.js';

type LogMock = jest.Mock<void, [message: string, error?: unknown]>;

export type FakeLogger = { [K in keyof AppLogger]: LogMock };

export const fakeLogger = (): FakeLogger => ({
  debug: jest.fn<void, [string, unknown?]>(),
  info: jest.fn<void, [string, unknown?]>(),
  warn: jest.fn<void, [string, unknown?]>(),
  error: jest.fn<void, [string, unknown?]>()
});

/** The message of the first call to one log level. */
export const firstMessage = (mock: LogMock): string =>
  mock.mock.calls[0]?.[0] ?? '';

/** Every message passed to the logger, at any level. */
export const loggedMessages = (logger: FakeLogger): string[] =>
  Object.values(logger).flatMap((mock) =>
    mock.mock.calls.map(([message]) => message)
  );
