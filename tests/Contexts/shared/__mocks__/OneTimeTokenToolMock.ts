import { createHash } from 'node:crypto';

import type { OneTimeTokenTool } from '../../../../src/Contexts/shared/plugins/index.js';
import { random } from '../fixtures/index.js';

/**
 * Hands out a known token per call; `hash` is a real SHA-256 so hashes have
 * the stored shape and differ for every token.
 */
export class OneTimeTokenToolMock implements OneTimeTokenTool {
  readonly generated: Array<{ token: string; tokenHash: string }> = [];
  readonly generate = jest.fn(() => {
    const token = `token-${random.uuid()}`;
    const pair = { token, tokenHash: this.hash(token) };
    this.generated.push(pair);

    return pair;
  });

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /** The single pair handed out so far. */
  lastGenerated(): { token: string; tokenHash: string } {
    const pair = this.generated.at(-1);
    if (!pair) throw new TypeError('No token was generated');

    return pair;
  }
}
