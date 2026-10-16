import type {
  EmailMessage,
  Mailer,
  MailReceipt
} from '../../application/mailer/index.js';
import type { AppLogger } from '../../plugins/index.js';
import {
  formatSender,
  PLACEHOLDER_SENDER_ADDRESS,
  type SenderIdentity
} from './SenderIdentity.js';

/** Development without credentials: writes the message to the log, sends nothing. */
export class ConsoleMailer implements Mailer {
  private readonly logger: AppLogger;
  private readonly sender: SenderIdentity;
  private sentCount = 0;

  constructor({
    logger,
    sender
  }: {
    logger: AppLogger;
    sender: SenderIdentity;
  }) {
    this.logger = logger;
    this.sender = {
      ...sender,
      address: sender.address || PLACEHOLDER_SENDER_ADDRESS
    };
  }

  send(message: EmailMessage): Promise<MailReceipt> {
    this.sentCount += 1;

    const htmlPart =
      message.html === undefined ? '' : ` | html: ${message.html}`;
    this.logger.info(
      `[SIMULATED EMAIL] from: ${formatSender(this.sender)} | to: ${message.to.value} | subject: ${message.subject} | text: ${message.text}${htmlPart}`
    );

    return Promise.resolve({ messageId: `simulated-${this.sentCount}` });
  }
}
