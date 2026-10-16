import type { BackgroundTasks } from '../../../../../../src/Contexts/shared/application/background/index.js';
import type { Mailer } from '../../../../../../src/Contexts/shared/application/mailer/index.js';
import { InMemoryMailer } from '../../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { suite } from './suite.js';

/** The recorder of every email the suite's API has sent (test mode only). */
export function mailbox(): InMemoryMailer {
  const mailer = suite().appContainer.resolve<Mailer>('mailer');
  if (!(mailer instanceof InMemoryMailer)) {
    throw new TypeError('The suite mailer is not the in-memory recorder');
  }

  return mailer;
}

/**
 * The recorder once every email the API started sending has settled. Emails
 * leave after the answer, so steps that read mail must use this one.
 */
export async function settledMailbox(): Promise<InMemoryMailer> {
  await suite().appContainer.resolve<BackgroundTasks>('backgroundTasks').idle();

  return mailbox();
}
