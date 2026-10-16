import type { Mailer } from '../../application/mailer/index.js';
import { InvalidArgumentException } from '../../domain/errors/index.js';
import { Email } from '../../domain/valueObject/index.js';
import type { AppLogger } from '../../plugins/index.js';
import { ConsoleMailer } from './ConsoleMailer.js';
import { InMemoryMailer } from './InMemoryMailer.js';
import {
  MailerConfigurationError,
  SUPPORTED_MODES
} from './MailerConfigurationError.js';
import { ResendMailer } from './ResendMailer.js';
import type { SenderIdentity } from './SenderIdentity.js';

export interface MailerSettings {
  fromAddress: string;
  fromName: string;
  resendApiKey: string;
  sendTimeoutMs: number;
}

interface CreateMailerDeps {
  nodeEnv: string;
  settings: MailerSettings;
  logger: AppLogger;
  appVersion: string;
  fetch?: typeof fetch;
}

type MailerMode = (typeof SUPPORTED_MODES)[number];

const MAX_SEND_TIMEOUT_MS = 10_000;
const LINE_BREAK = /[\r\n]/;

const isSupportedMode = (value: string): value is MailerMode =>
  (SUPPORTED_MODES as readonly string[]).includes(value);

const senderFrom = (
  address: string,
  { fromName }: MailerSettings
): SenderIdentity => (fromName ? { address, name: fromName } : { address });

const validatedSenderAddress = (fromAddress: string): string => {
  try {
    return new Email(fromAddress).value;
  } catch (error) {
    // Email's message includes the value; the start-up error must not.
    if (error instanceof InvalidArgumentException) {
      throw MailerConfigurationError.invalidSetting('MAIL_FROM_ADDRESS');
    }
    throw error;
  }
};

const buildRealMailer = ({
  settings,
  logger,
  appVersion,
  fetch
}: CreateMailerDeps): ResendMailer => {
  if (settings.resendApiKey === '') {
    throw MailerConfigurationError.missingSetting('RESEND_API_KEY');
  }
  if (settings.fromAddress === '') {
    throw MailerConfigurationError.missingSetting('MAIL_FROM_ADDRESS');
  }
  const address = validatedSenderAddress(settings.fromAddress);
  if (LINE_BREAK.test(settings.fromName)) {
    throw MailerConfigurationError.invalidSetting('MAIL_FROM_NAME');
  }
  const { sendTimeoutMs } = settings;
  if (
    !Number.isInteger(sendTimeoutMs) ||
    sendTimeoutMs < 1 ||
    sendTimeoutMs > MAX_SEND_TIMEOUT_MS
  ) {
    throw MailerConfigurationError.invalidSetting('MAIL_SEND_TIMEOUT_MS');
  }

  return new ResendMailer({
    apiKey: settings.resendApiKey,
    sender: senderFrom(address, settings),
    timeoutMs: sendTimeoutMs,
    appVersion,
    logger,
    ...(fetch ? { fetch } : {})
  });
};

const buildDevelopmentMailer = (deps: CreateMailerDeps): Mailer => {
  const { settings, logger } = deps;

  if (settings.resendApiKey === '') {
    logger.warn('Email delivery is simulated (no RESEND_API_KEY)');
    return new ConsoleMailer({
      logger,
      sender: senderFrom(settings.fromAddress, settings)
    });
  }

  const mailer = buildRealMailer(deps);
  logger.warn('Email delivery is REAL in development (Resend)');
  return mailer;
};

/**
 * Picks the one mail channel for this process from `NODE_ENV` and the
 * presence of `RESEND_API_KEY`. Settings are checked only for the real
 * channel; an unknown mode stops start-up.
 */
export function createMailer(deps: CreateMailerDeps): Mailer {
  const { nodeEnv } = deps;

  if (!isSupportedMode(nodeEnv)) {
    throw MailerConfigurationError.unsupportedMode(nodeEnv);
  }

  switch (nodeEnv) {
    case 'test':
      return new InMemoryMailer();
    case 'development':
      return buildDevelopmentMailer(deps);
    case 'production':
      return buildRealMailer(deps);
  }
}
