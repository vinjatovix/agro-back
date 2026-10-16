import {
  ConsoleMailer,
  PLACEHOLDER_SENDER_ADDRESS
} from '../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { EmailMessageMother } from '../../application/mailer/EmailMessageMother.js';
import { EmailMother } from '../../domain/mothers/EmailMother.js';
import { random } from '../../fixtures/index.js';
import { fakeLogger, firstMessage } from './fakeLogger.js';

const buildMailer = (address = EmailMother.random().value, name?: string) => {
  const logger = fakeLogger();
  const mailer = new ConsoleMailer({
    logger,
    sender: name === undefined ? { address } : { address, name }
  });

  return { mailer, logger };
};

const firstInfo = (logger: ReturnType<typeof fakeLogger>): string =>
  firstMessage(logger.info);

describe('ConsoleMailer', () => {
  it('resolves with consecutive simulated ids', async () => {
    const { mailer } = buildMailer();

    const first = await mailer.send(EmailMessageMother.create());
    const second = await mailer.send(EmailMessageMother.create());

    expect(first).toEqual({ messageId: 'simulated-1' });
    expect(second).toEqual({ messageId: 'simulated-2' });
  });

  it('logs the marker, sender, recipient, subject and body once', async () => {
    const sender = EmailMother.random().value;
    const name = random.word({ min: 3, max: 10 });
    const { mailer, logger } = buildMailer(sender, name);
    const message = EmailMessageMother.create();

    await mailer.send(message);

    expect(logger.info).toHaveBeenCalledTimes(1);
    const line = firstInfo(logger);
    expect(line).toContain('[SIMULATED EMAIL]');
    expect(line).toContain(`"${name}" <${sender}>`);
    expect(line).toContain(message.to.value);
    expect(line).toContain(message.subject);
    expect(line).toContain(message.text);
    expect(line).not.toContain('html:');
  });

  it('uses the placeholder sender when no address is configured', async () => {
    const { mailer, logger } = buildMailer('');

    await mailer.send(EmailMessageMother.create());

    expect(firstInfo(logger)).toContain(PLACEHOLDER_SENDER_ADDRESS);
  });

  it('mentions the html body when present', async () => {
    const { mailer, logger } = buildMailer();
    const message = EmailMessageMother.withHtml();

    await mailer.send(message);

    expect(firstInfo(logger)).toContain(`html: ${message.html}`);
  });
});
