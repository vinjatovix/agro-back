import {
  MailDeliveryException,
  type EmailMessage,
  type MailDeliveryReason
} from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { ResendMailer } from '../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { EmailMessageMother } from '../../application/mailer/EmailMessageMother.js';
import { EmailMother } from '../../domain/mothers/EmailMother.js';
import { random } from '../../fixtures/index.js';
import { fakeLogger, firstMessage, loggedMessages } from './fakeLogger.js';

type FetchArgs = Parameters<typeof fetch>;

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const unreadableResponse = (status: number): Response =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new TypeError('connection reset'));
      }
    }),
    { status }
  );

/** A fetch that only settles when its signal aborts, like a provider that hangs. */
const hangingFetch = (_url: FetchArgs[0], init?: FetchArgs[1]) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      const reason: unknown = init.signal?.reason;
      // Jest's sandbox has its own `Error`, so check the abort reason's own class.
      reject(
        reason instanceof DOMException ? reason : new TypeError('aborted')
      );
    });
  });

const buildMailer = ({
  name,
  timeoutMs = 5000
}: { name?: string; timeoutMs?: number } = {}) => {
  const fetchMock = jest.fn<Promise<Response>, FetchArgs>();
  const logger = fakeLogger();
  const apiKey = `re_${random.word({ min: 16, max: 24 })}`;
  const address = EmailMother.random().value;
  const appVersion = `${random.integer({ min: 1, max: 9 })}.0.0`;
  const mailer = new ResendMailer({
    apiKey,
    sender: name === undefined ? { address } : { address, name },
    timeoutMs,
    appVersion,
    logger,
    fetch: fetchMock
  });

  return { mailer, fetchMock, logger, apiKey, address, appVersion };
};

const sentRequest = (
  fetchMock: jest.Mock<Promise<Response>, FetchArgs>
): { url: string; init: RequestInit; body: Record<string, unknown> } => {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  if (typeof url !== 'string' || !init || typeof init.body !== 'string') {
    throw new TypeError('fetch was not called with a URL and a JSON body');
  }

  return {
    url,
    init,
    body: JSON.parse(init.body) as Record<string, unknown>
  };
};

const sendAndCatch = async (
  mailer: ResendMailer,
  message: EmailMessage
): Promise<MailDeliveryException> => {
  try {
    await mailer.send(message);
  } catch (error) {
    if (error instanceof MailDeliveryException) return error;
    throw error;
  }

  throw new TypeError('Expected send to reject');
};

describe('ResendMailer', () => {
  it('posts the message to the Resend emails endpoint', async () => {
    const { mailer, fetchMock, apiKey, address, appVersion } = buildMailer();
    fetchMock.mockResolvedValue(jsonResponse(200, { id: random.uuid() }));
    const message = EmailMessageMother.create();

    await mailer.send(message);

    const { url, init, body } = sentRequest(fetchMock);
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `agro-back/${appVersion}`
    });
    expect(body).toEqual({
      from: address,
      to: [message.to.value],
      subject: message.subject,
      text: message.text
    });
    expect(body).not.toHaveProperty('html');
  });

  it('formats the sender with its display name and sends html when present', async () => {
    const name = random.word({ min: 3, max: 10 });
    const { mailer, fetchMock, address } = buildMailer({ name });
    fetchMock.mockResolvedValue(jsonResponse(200, { id: random.uuid() }));
    const message = EmailMessageMother.withHtml();

    await mailer.send(message);

    const { body } = sentRequest(fetchMock);
    expect(body.from).toBe(`"${name}" <${address}>`);
    expect(body.html).toBe(message.html);
  });

  it('escapes quotes and backslashes in the display name', async () => {
    const word = random.word({ min: 3, max: 10 });
    const { mailer, fetchMock, address } = buildMailer({
      name: `${word} "${word}" \\`
    });
    fetchMock.mockResolvedValue(jsonResponse(200, { id: random.uuid() }));

    await mailer.send(EmailMessageMother.create());

    expect(sentRequest(fetchMock).body.from).toBe(
      `"${word} \\"${word}\\" \\\\" <${address}>`
    );
  });

  it('resolves with the provider id and logs the domain, not the body', async () => {
    const { mailer, fetchMock, logger } = buildMailer();
    const id = random.uuid();
    fetchMock.mockResolvedValue(jsonResponse(200, { id }));
    const message = EmailMessageMother.create();

    const receipt = await mailer.send(message);

    expect(receipt).toEqual({ messageId: id });
    expect(logger.info).toHaveBeenCalledTimes(1);
    const line = firstMessage(logger.info);
    expect(line).toContain(message.recipientDomain());
    expect(line).toContain(id);
    expect(line).not.toContain(message.text);
  });

  it('resolves with an empty receipt when the success body has no id', async () => {
    const { mailer, fetchMock } = buildMailer();
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await expect(mailer.send(EmailMessageMother.create())).resolves.toEqual({});
  });

  it('resolves when the provider accepted the message but its body cannot be read', async () => {
    const { mailer, fetchMock, logger } = buildMailer();
    fetchMock.mockResolvedValue(unreadableResponse(200));

    await expect(mailer.send(EmailMessageMother.create())).resolves.toEqual({});
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('maps by status when an error body cannot be read', async () => {
    const { mailer, fetchMock } = buildMailer();
    fetchMock.mockResolvedValue(unreadableResponse(429));

    const error = await sendAndCatch(mailer, EmailMessageMother.create());

    expect(error.reason).toBe('rateLimited');
  });

  it('gives up with a time-out when the provider does not answer in time', async () => {
    const { mailer, fetchMock } = buildMailer({ timeoutMs: 20 });
    fetchMock.mockImplementation(hangingFetch);

    const error = await sendAndCatch(mailer, EmailMessageMother.create());

    expect(error.reason).toBe('timeout');
  });

  it.each<[number, MailDeliveryReason]>([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [429, 'rateLimited'],
    [422, 'rejected'],
    [500, 'unavailable']
  ])('maps status %i to reason %s', async (status, reason) => {
    const { mailer, fetchMock, logger, apiKey } = buildMailer();
    const errorName = random.word({ min: 5, max: 12 });
    fetchMock.mockResolvedValue(
      jsonResponse(status, {
        statusCode: status,
        name: errorName,
        message: random.description()
      })
    );
    const message = EmailMessageMother.create();

    const error = await sendAndCatch(mailer, message);

    expect(error.reason).toBe(reason);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const line = firstMessage(logger.error);
    expect(line).toContain(message.recipientDomain());
    expect(line).toContain(reason);
    expect(line).toContain(`${status}/${errorName}`);
    for (const text of [line, error.message]) {
      expect(text).not.toContain(apiKey);
      expect(text).not.toContain(message.text);
    }
  });

  it('maps by status when the error body is not JSON', async () => {
    const { mailer, fetchMock } = buildMailer();
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));

    const error = await sendAndCatch(mailer, EmailMessageMother.create());

    expect(error.reason).toBe('unavailable');
  });

  it.each<[string, unknown, MailDeliveryReason]>([
    ['a network error', new TypeError('fetch failed'), 'unavailable'],
    [
      'a time-out',
      new DOMException('The operation timed out', 'TimeoutError'),
      'timeout'
    ],
    [
      'an abort',
      new DOMException('This operation was aborted', 'AbortError'),
      'timeout'
    ]
  ])('maps %s to reason %s', async (_label, failure, reason) => {
    const { mailer, fetchMock, logger, apiKey } = buildMailer();
    fetchMock.mockRejectedValue(failure);
    const message = EmailMessageMother.create();

    const error = await sendAndCatch(mailer, message);

    expect(error.reason).toBe(reason);
    expect(logger.error).toHaveBeenCalledTimes(1);
    for (const text of [...loggedMessages(logger), error.message]) {
      expect(text).not.toContain(apiKey);
      expect(text).not.toContain(message.text);
    }
  });
});
