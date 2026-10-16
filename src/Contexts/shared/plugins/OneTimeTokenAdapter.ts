import { createHash, randomBytes } from 'node:crypto';

import type { OneTimeTokenTool } from './OneTimeTokenTool.js';

// 256 bits: guessing is impossible, so a plain SHA-256 is enough to store it.
const TOKEN_BYTES = 32;

export class OneTimeTokenAdapter implements OneTimeTokenTool {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
