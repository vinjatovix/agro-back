import type { Mailer } from '../../../../../../src/Contexts/shared/application/mailer/index.js';
import { InMemoryMailer } from '../../../../../../src/Contexts/shared/infrastructure/mailer/index.js';
import { suite } from './suite.js';

/** The recorder of every email the suite's API has sent (test mode only). */
export function mailbox(): InMemoryMailer {
  const mailer = suite().container.resolve<Mailer>('mailer');
  if (!(mailer instanceof InMemoryMailer)) {
    throw new TypeError('The suite mailer is not the in-memory recorder');
  }

  return mailer;
}
