import {
  EmailMessage,
  type EmailMessagePrimitives
} from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { EmailMother } from '../../domain/mothers/EmailMother.js';
import { random } from '../../fixtures/index.js';

export class EmailMessageMother {
  static primitives(
    overrides: Partial<EmailMessagePrimitives> = {}
  ): EmailMessagePrimitives {
    return {
      to: EmailMother.random().value,
      subject: random.description(4),
      text: random.description(12),
      ...overrides
    };
  }

  static create(overrides: Partial<EmailMessagePrimitives> = {}): EmailMessage {
    return EmailMessage.create(this.primitives(overrides));
  }

  static primitivesWithHtml(): EmailMessagePrimitives {
    return this.primitives({ html: `<p>${random.description(8)}</p>` });
  }

  static withHtml(): EmailMessage {
    return EmailMessage.create(this.primitivesWithHtml());
  }

  static malformedRecipient(): EmailMessagePrimitives {
    return this.primitives({ to: random.word({ min: 6, max: 12 }) });
  }

  static blankSubject(): EmailMessagePrimitives {
    return this.primitives({ subject: '   ' });
  }

  static subjectWithLineFeed(): EmailMessagePrimitives {
    return this.primitives({
      subject: `${random.word({ min: 3, max: 8 })}\n${random.word({ min: 3, max: 8 })}`
    });
  }

  static subjectWithCarriageReturn(): EmailMessagePrimitives {
    return this.primitives({
      subject: `${random.word({ min: 3, max: 8 })}\r${random.word({ min: 3, max: 8 })}`
    });
  }

  static blankText(): EmailMessagePrimitives {
    return this.primitives({ text: '  ' });
  }

  static blankHtml(): EmailMessagePrimitives {
    return this.primitives({ html: ' ' });
  }
}
