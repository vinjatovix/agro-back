import { OneTimeTokenAdapter } from '../../../../src/Contexts/shared/plugins/OneTimeTokenAdapter.js';

const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;
const LOWERCASE_HEX_64 = /^[0-9a-f]{64}$/;

describe('OneTimeTokenAdapter', () => {
  const tool = new OneTimeTokenAdapter();

  it('should generate a 43-character base64url token', () => {
    const { token } = tool.generate();

    expect(token).toMatch(BASE64URL_43);
  });

  it('should generate a different token on every call', () => {
    expect(tool.generate().token).not.toBe(tool.generate().token);
  });

  it('should return the hash of the token it generates', () => {
    const { token, tokenHash } = tool.generate();

    expect(tokenHash).toBe(tool.hash(token));
  });

  it('should hash to 64 lowercase hex characters, the same every time', () => {
    const { token } = tool.generate();

    expect(tool.hash(token)).toMatch(LOWERCASE_HEX_64);
    expect(tool.hash(token)).toBe(tool.hash(token));
  });

  it('should give another hash when one character changes', () => {
    const { token } = tool.generate();
    const changed = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

    expect(tool.hash(changed)).not.toBe(tool.hash(token));
  });
});
