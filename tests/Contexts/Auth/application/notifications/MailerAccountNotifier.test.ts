import { MailerAccountNotifier } from '../../../../../src/Contexts/Auth/application/notifications/index.js';
import type {
  EmailMessage,
  Mailer,
  MailReceipt
} from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { MailDeliveryException } from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { InMemoryMailer } from '../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { BackgroundTasksFake } from '../../../shared/__mocks__/BackgroundTasksFake.js';

const BASE_URL = 'https://app.example.com';
const TOKEN = 'a'.repeat(43);

class FailingMailer implements Mailer {
  send(message: EmailMessage): Promise<MailReceipt> {
    return Promise.reject(
      new MailDeliveryException({
        reason: 'unavailable',
        recipientDomain: message.recipientDomain()
      })
    );
  }
}

describe('MailerAccountNotifier', () => {
  const email = new Email('ana@example.com');
  let mailer: InMemoryMailer;
  let backgroundTasks: BackgroundTasksFake;
  let notifier: MailerAccountNotifier;

  beforeEach(() => {
    mailer = new InMemoryMailer();
    backgroundTasks = new BackgroundTasksFake();
    notifier = new MailerAccountNotifier({
      mailer,
      backgroundTasks,
      activationLinkBaseUrl: BASE_URL
    });
  });

  it.each([
    [
      'activation',
      () => notifier.activation(email, TOKEN),
      'Activa tu cuenta de MiBancal'
    ],
    [
      'registrationAttempt',
      () => notifier.registrationAttempt(email),
      'Alguien ha intentado registrarse con tu email'
    ],
    [
      'providerLinked',
      () => notifier.providerLinked(email, 'google', new Date()),
      'Se ha vinculado Google a tu cuenta'
    ]
  ])(
    'should send one %s email to the recipient',
    async (kind, notify, subject) => {
      notify();
      await backgroundTasks.idle();

      const sent = mailer.sentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0]?.to.value).toBe(email.value);
      expect(sent[0]?.subject).toBe(subject);
      expect(backgroundTasks.labels).toEqual([
        `Account email ${kind} to example.com`
      ]);
    }
  );

  it('should link to the frontend page with the token in the fragment', async () => {
    notifier.activation(email, TOKEN);
    await backgroundTasks.idle();

    expect(mailer.sentMessages()[0]?.text).toContain(
      `${BASE_URL}/activate#token=${TOKEN}`
    );
  });

  it('should schedule the send without waiting for the mailer', () => {
    const sendSpy = jest.spyOn(mailer, 'send');

    notifier.registrationAttempt(email);

    expect(backgroundTasks.labels).toHaveLength(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('should never let a mailer failure escape', async () => {
    notifier = new MailerAccountNotifier({
      mailer: new FailingMailer(),
      backgroundTasks,
      activationLinkBaseUrl: BASE_URL
    });

    expect(() => notifier.activation(email, TOKEN)).not.toThrow();
    await expect(backgroundTasks.idle()).resolves.toBeUndefined();
    expect(backgroundTasks.failures).toHaveLength(1);
  });
});
