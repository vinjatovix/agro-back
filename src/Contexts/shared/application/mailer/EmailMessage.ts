import { InvalidArgumentException } from '../../domain/errors/index.js';
import { Email } from '../../domain/valueObject/index.js';

export interface EmailMessagePrimitives {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const LINE_BREAK = /[\r\n]/;

/** A validated, immutable message ready for any `Mailer` channel. */
export class EmailMessage {
  readonly to: Email;
  readonly subject: string;
  readonly text: string;
  readonly html: string | undefined;

  private constructor({
    to,
    subject,
    text,
    html
  }: {
    to: Email;
    subject: string;
    text: string;
    html: string | undefined;
  }) {
    this.to = to;
    this.subject = subject;
    this.text = text;
    this.html = html;
  }

  static create(primitives: EmailMessagePrimitives): EmailMessage {
    const errors: Record<string, string> = {};
    const to = EmailMessage.buildRecipient(primitives.to, errors);
    const subject = primitives.subject.trim();

    if (subject === '') {
      errors.subject = '<subject> must not be empty';
    } else if (LINE_BREAK.test(subject)) {
      errors.subject = '<subject> must not contain line breaks';
    }

    if (primitives.text.trim() === '') {
      errors.text = '<text> must not be empty';
    }

    if (primitives.html !== undefined && primitives.html.trim() === '') {
      errors.html = '<html> must not be empty when present';
    }

    if (to === undefined || Object.keys(errors).length > 0) {
      throw new InvalidArgumentException('Invalid email message', errors);
    }

    return new EmailMessage({
      to,
      subject,
      text: primitives.text,
      html: primitives.html
    });
  }

  private static buildRecipient(
    value: string,
    errors: Record<string, string>
  ): Email | undefined {
    try {
      return new Email(value);
    } catch (error) {
      if (!(error instanceof InvalidArgumentException)) throw error;
      // Email's message includes the value; this one must not.
      errors.to = '<to> must be a valid email address';
      return undefined;
    }
  }

  recipientDomain(): string {
    return this.to.value.slice(this.to.value.lastIndexOf('@') + 1);
  }
}
