import {
  EmailMessage,
  type EmailMessagePrimitives
} from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { EmailMessageMother } from './EmailMessageMother.js';

const captureError = (
  primitives: EmailMessagePrimitives
): InvalidArgumentException => {
  try {
    EmailMessage.create(primitives);
  } catch (error) {
    if (error instanceof InvalidArgumentException) return error;
    throw error;
  }

  throw new TypeError('Expected EmailMessage.create to throw');
};

describe('EmailMessage', () => {
  it('creates a message without html and keeps html undefined', () => {
    const primitives = EmailMessageMother.primitives();

    const message = EmailMessage.create(primitives);

    expect(message.to.value).toBe(primitives.to);
    expect(message.subject).toBe(primitives.subject);
    expect(message.text).toBe(primitives.text);
    expect(message.html).toBeUndefined();
  });

  it('creates a message with html', () => {
    const primitives = EmailMessageMother.primitivesWithHtml();

    const message = EmailMessage.create(primitives);

    expect(message.html).toBe(primitives.html);
  });

  it('returns the recipient domain', () => {
    const primitives = EmailMessageMother.primitives();

    const message = EmailMessage.create(primitives);

    expect(message.recipientDomain()).toBe(primitives.to.split('@')[1]);
  });

  it('stores the subject trimmed and the text as given', () => {
    const primitives = EmailMessageMother.primitives();

    const message = EmailMessage.create({
      ...primitives,
      subject: `  ${primitives.subject}  `,
      text: `  ${primitives.text}  `
    });

    expect(message.subject).toBe(primitives.subject);
    expect(message.text).toBe(`  ${primitives.text}  `);
  });

  it.each([
    ['to', EmailMessageMother.malformedRecipient()],
    ['subject', EmailMessageMother.blankSubject()],
    ['subject', EmailMessageMother.subjectWithLineFeed()],
    ['subject', EmailMessageMother.subjectWithCarriageReturn()],
    ['text', EmailMessageMother.blankText()],
    ['html', EmailMessageMother.blankHtml()]
  ])('rejects an invalid %s', (field, primitives) => {
    const error = captureError(primitives);

    expect(Object.keys(error.errors ?? {})).toEqual([field]);
  });

  it('does not echo a malformed recipient', () => {
    const primitives = EmailMessageMother.malformedRecipient();

    const error = captureError(primitives);

    expect(error.message).not.toContain(primitives.to);
    expect(error.errors?.to).not.toContain(primitives.to);
  });

  it('reports one entry per invalid field', () => {
    const error = captureError({
      ...EmailMessageMother.blankSubject(),
      text: EmailMessageMother.blankText().text
    });

    expect(Object.keys(error.errors ?? {}).sort()).toEqual(['subject', 'text']);
  });
});
