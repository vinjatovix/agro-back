import type {
  EmailMessage,
  Mailer,
  MailReceipt
} from '../../application/mailer/index.js';

/** Test mode: records every message in send order and never leaves the process. */
export class InMemoryMailer implements Mailer {
  private readonly messages: EmailMessage[] = [];
  private sentCount = 0;

  send(message: EmailMessage): Promise<MailReceipt> {
    this.messages.push(message);
    this.sentCount += 1;

    return Promise.resolve({ messageId: `memory-${this.sentCount}` });
  }

  sentMessages(): readonly EmailMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages.length = 0;
  }
}
