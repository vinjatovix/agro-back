import type { EmailMessage } from './EmailMessage.js';

export interface MailReceipt {
  messageId?: string;
}

export interface Mailer {
  /**
   * Sends one validated message from the configured sender.
   * Resolves with a receipt, or rejects with MailDeliveryException.
   * Never settles later than the configured time-out (≤ 10 s). A time-out
   * or network failure does not prove the message was not delivered.
   */
  send(message: EmailMessage): Promise<MailReceipt>;
}
