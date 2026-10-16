import { DomainException } from '../../domain/errors/index.js';

export type MailDeliveryReason =
  'rejected' | 'unauthorized' | 'rateLimited' | 'unavailable' | 'timeout';

/** A message could not be delivered. Carries no credentials and no body. */
export class MailDeliveryException extends DomainException {
  public readonly reason: MailDeliveryReason;

  constructor({
    reason,
    recipientDomain
  }: {
    reason: MailDeliveryReason;
    recipientDomain: string;
  }) {
    super(`Email to <${recipientDomain}> could not be delivered: ${reason}`);
    this.reason = reason;
  }
}
