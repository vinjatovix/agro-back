import {
  ConsoleMailer,
  createMailer,
  InMemoryMailer,
  MailerConfigurationError,
  ResendMailer,
  type MailerSettings
} from '../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { EmailMessageMother } from '../../application/mailer/EmailMessageMother.js';
import { EmailMother } from '../../domain/mothers/EmailMother.js';
import { random } from '../../fixtures/index.js';
import { fakeLogger, firstMessage } from './fakeLogger.js';

const settingsWith = (
  overrides: Partial<MailerSettings> = {}
): MailerSettings => ({
  fromAddress: EmailMother.random().value,
  fromName: random.word({ min: 3, max: 10 }),
  resendApiKey: `re_${random.word({ min: 16, max: 24 })}`,
  sendTimeoutMs: 5000,
  ...overrides
});

const build = (nodeEnv: string, settings: MailerSettings) => {
  const logger = fakeLogger();
  const fetchMock = jest
    .fn<Promise<Response>, Parameters<typeof fetch>>()
    .mockResolvedValue(Response.json({ id: random.uuid() }));
  const create = () =>
    createMailer({
      nodeEnv,
      settings,
      logger,
      appVersion: '1.0.0',
      fetch: fetchMock
    });

  return { logger, create, fetchMock };
};

const sentFrom = async ({
  create,
  fetchMock
}: ReturnType<typeof build>): Promise<unknown> => {
  await create().send(EmailMessageMother.create());
  const init = fetchMock.mock.calls[0]?.[1];
  if (typeof init?.body !== 'string') {
    throw new TypeError('fetch was not called with a JSON body');
  }

  return (JSON.parse(init.body) as { from?: unknown }).from;
};

const configurationError = (
  create: () => unknown
): MailerConfigurationError => {
  try {
    create();
  } catch (error) {
    if (error instanceof MailerConfigurationError) return error;
    throw error;
  }

  throw new TypeError('Expected createMailer to throw');
};

describe('createMailer', () => {
  it.each([
    ['with', settingsWith()],
    ['without', settingsWith({ resendApiKey: '', fromAddress: '' })]
  ])(
    'records in memory in test %s a key, without checking settings',
    (_label, settings) => {
      const { create, logger } = build('test', {
        ...settings,
        sendTimeoutMs: 0
      });

      expect(create()).toBeInstanceOf(InMemoryMailer);
      expect(logger.warn).not.toHaveBeenCalled();
    }
  );

  it('simulates in development without a key and warns once', () => {
    const { create, logger } = build(
      'development',
      settingsWith({ resendApiKey: '', fromAddress: '' })
    );

    expect(create()).toBeInstanceOf(ConsoleMailer);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(firstMessage(logger.warn)).toContain('simulated');
  });

  it('delivers for real in development with key and sender, and warns once', () => {
    const { create, logger } = build('development', settingsWith());

    expect(create()).toBeInstanceOf(ResendMailer);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(firstMessage(logger.warn)).toContain('REAL');
  });

  it('refuses development with a key but no sender instead of simulating', () => {
    const { create } = build('development', settingsWith({ fromAddress: '' }));

    expect(configurationError(create).message).toContain('MAIL_FROM_ADDRESS');
  });

  it('delivers for real in production without the development warning', () => {
    const { create, logger } = build('production', settingsWith());

    expect(create()).toBeInstanceOf(ResendMailer);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('sends from the configured name and address', async () => {
    const settings = settingsWith({
      fromName: `${random.word({ min: 3, max: 10 })}, Inc.`
    });

    const from = await sentFrom(build('production', settings));

    expect(from).toBe(`"${settings.fromName}" <${settings.fromAddress}>`);
  });

  it('sends from the bare address when no name is configured', async () => {
    const settings = settingsWith({ fromName: '' });

    const from = await sentFrom(build('production', settings));

    expect(from).toBe(settings.fromAddress);
  });

  it('simulates from the configured sender in development without a key', async () => {
    const settings = settingsWith({ resendApiKey: '' });
    const { create, logger } = build('development', settings);

    await create().send(EmailMessageMother.create());

    expect(firstMessage(logger.info)).toContain(
      `"${settings.fromName}" <${settings.fromAddress}>`
    );
  });

  it('refuses production without a key', () => {
    const { create } = build('production', settingsWith({ resendApiKey: '' }));

    expect(configurationError(create).message).toContain('RESEND_API_KEY');
  });

  it('refuses production without a sender', () => {
    const settings = settingsWith({ fromAddress: '' });
    const { create } = build('production', settings);

    const error = configurationError(create);

    expect(error.message).toContain('MAIL_FROM_ADDRESS');
    expect(error.message).not.toContain(settings.resendApiKey);
  });

  it('refuses a malformed sender without echoing it', () => {
    const fromAddress = 'not-an-email';
    const settings = settingsWith({ fromAddress });
    const { create } = build('production', settings);

    const error = configurationError(create);

    expect(error.message).toContain('MAIL_FROM_ADDRESS');
    expect(error.message).not.toContain(fromAddress);
    expect(error.message).not.toContain(settings.resendApiKey);
  });

  it.each(['\n', '\r'])(
    'refuses a sender name with the line break %j',
    (lineBreak) => {
      const settings = settingsWith({
        fromName: `${random.word({ min: 3, max: 10 })}${lineBreak}${random.word({ min: 3, max: 10 })}`
      });
      const { create } = build('production', settings);

      expect(configurationError(create).message).toContain('MAIL_FROM_NAME');
    }
  );

  it.each([1, 10000])('accepts a send time-out of %i', (sendTimeoutMs) => {
    const { create } = build('production', settingsWith({ sendTimeoutMs }));

    expect(create()).toBeInstanceOf(ResendMailer);
  });

  it.each([0, 10001])('refuses a send time-out of %i', (sendTimeoutMs) => {
    const { create } = build('production', settingsWith({ sendTimeoutMs }));

    expect(configurationError(create).message).toContain(
      'MAIL_SEND_TIMEOUT_MS'
    );
  });

  it.each(['prod', 'staging', ''])('refuses the unknown mode %p', (nodeEnv) => {
    const { create } = build(nodeEnv, settingsWith());

    expect(configurationError(create).message).toContain(`'${nodeEnv}'`);
  });
});
