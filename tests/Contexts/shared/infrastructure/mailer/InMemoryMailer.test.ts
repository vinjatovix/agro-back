import type { EmailMessage } from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { InMemoryMailer } from '../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { EmailMessageMother } from '../../application/mailer/EmailMessageMother.js';

describe('InMemoryMailer', () => {
  it('records sends in order with their content', async () => {
    const mailer = new InMemoryMailer();
    const first = EmailMessageMother.create();
    const second = EmailMessageMother.create();

    const receipts = [await mailer.send(first), await mailer.send(second)];

    expect(receipts).toEqual([
      { messageId: 'memory-1' },
      { messageId: 'memory-2' }
    ]);
    expect(mailer.sentMessages()).toEqual([first, second]);
  });

  it('clear empties the record and later sends are recorded alone', async () => {
    const mailer = new InMemoryMailer();
    await mailer.send(EmailMessageMother.create());

    mailer.clear();

    expect(mailer.sentMessages()).toEqual([]);
    const next = EmailMessageMother.create();
    await mailer.send(next);
    expect(mailer.sentMessages()).toEqual([next]);
  });

  it('returns a copy that cannot change the record', async () => {
    const mailer = new InMemoryMailer();
    await mailer.send(EmailMessageMother.create());

    const copy = mailer.sentMessages() as EmailMessage[];
    copy.length = 0;

    expect(mailer.sentMessages()).toHaveLength(1);
  });
});
