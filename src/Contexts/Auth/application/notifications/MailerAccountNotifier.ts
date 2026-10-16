import type { BackgroundTasks } from '../../../shared/application/background/index.js';
import {
  EmailMessage,
  type EmailMessagePrimitives,
  type Mailer
} from '../../../shared/application/mailer/index.js';
import type { Email } from '../../../shared/domain/valueObject/index.js';
import type { AuthProvider } from '../../domain/value-objects/types/index.js';
import type { AccountNotifier } from './AccountNotifier.js';
import { activationEmail, activationLink } from './activationEmail.js';
import { passwordChangedEmail } from './passwordChangedEmail.js';
import { passwordResetEmail, passwordResetLink } from './passwordResetEmail.js';
import { providerLinkedEmail } from './providerLinkedEmail.js';
import { registrationAttemptEmail } from './registrationAttemptEmail.js';

type NoticeKind =
  | 'activation'
  | 'registrationAttempt'
  | 'providerLinked'
  | 'passwordReset'
  | 'passwordChanged';

export type MailerAccountNotifierDependencies = {
  mailer: Mailer;
  backgroundTasks: BackgroundTasks;
  frontendBaseUrl: string;
};

export class MailerAccountNotifier implements AccountNotifier {
  private readonly mailer: Mailer;
  private readonly backgroundTasks: BackgroundTasks;
  private readonly frontendBaseUrl: string;

  constructor({
    mailer,
    backgroundTasks,
    frontendBaseUrl
  }: MailerAccountNotifierDependencies) {
    this.mailer = mailer;
    this.backgroundTasks = backgroundTasks;
    this.frontendBaseUrl = frontendBaseUrl;
  }

  activation(email: Email, token: string): void {
    this.send(
      'activation',
      activationEmail({
        to: email.value,
        link: activationLink(this.frontendBaseUrl, token)
      })
    );
  }

  registrationAttempt(email: Email): void {
    this.send(
      'registrationAttempt',
      registrationAttemptEmail({ to: email.value })
    );
  }

  providerLinked(email: Email, provider: AuthProvider, at: Date): void {
    this.send(
      'providerLinked',
      providerLinkedEmail({ to: email.value, provider, linkedAt: at })
    );
  }

  passwordReset(email: Email, token: string): void {
    this.send(
      'passwordReset',
      passwordResetEmail({
        to: email.value,
        link: passwordResetLink(this.frontendBaseUrl, token)
      })
    );
  }

  passwordChanged(email: Email): void {
    this.send('passwordChanged', passwordChangedEmail({ to: email.value }));
  }

  /** A build error is a programming error: it propagates to the caller. */
  private send(kind: NoticeKind, primitives: EmailMessagePrimitives): void {
    const message = EmailMessage.create(primitives);

    this.backgroundTasks.run(
      `Account email ${kind} to ${message.recipientDomain()}`,
      () => this.mailer.send(message)
    );
  }
}
