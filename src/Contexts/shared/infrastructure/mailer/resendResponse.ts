const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isResendSuccess = (body: unknown): body is { id: string } =>
  isRecord(body) && typeof body.id === 'string';

/** The provider's error `name`; its `message` may echo request data, so it is not read. */
export const readResendErrorName = (body: unknown): string | undefined =>
  isRecord(body) && typeof body.name === 'string' ? body.name : undefined;
