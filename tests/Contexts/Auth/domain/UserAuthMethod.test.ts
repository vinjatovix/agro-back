import { UserAuthMethod } from '../../../../src/Contexts/Auth/domain/value-objects/UserAuthMethod.js';
import { PasswordHash } from '../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';

const VALID_PASSWORD_HASH = `$2b$10$${'a'.repeat(53)}`;

describe('UserAuthMethod', () => {
  it('should create a local auth method with password', () => {
    const method = UserAuthMethod.local(
      new PasswordHash(VALID_PASSWORD_HASH),
      new Date()
    );

    expect(method.provider).toBe('local');
    expect(method.password?.value).toBe(VALID_PASSWORD_HASH);
    expect(method.isLocal()).toBe(true);
  });

  it('should create a provider auth method with providerUserId', () => {
    const method = new UserAuthMethod({
      provider: 'google',
      providerUserId: 'google-sub-123',
      linkedAt: new Date()
    });

    expect(method.provider).toBe('google');
    expect(method.providerUserId).toBe('google-sub-123');
    expect(method.password).toBeUndefined();
    expect(method.isLocal()).toBe(false);
  });

  it('should throw when local provider has no password', () => {
    expect(() =>
      new UserAuthMethod({
        provider: 'local',
        linkedAt: new Date()
      })
    ).toThrow('<UserAuthMethod> local provider requires a password hash');
  });

  it('should throw when external provider has no providerUserId', () => {
    expect(() =>
      new UserAuthMethod({
        provider: 'github',
        linkedAt: new Date()
      })
    ).toThrow('<UserAuthMethod> provider <github> requires a providerUserId');
  });

  it('should throw when provider is unsupported', () => {
    expect(() =>
      new UserAuthMethod({
        provider: 'twitter' as unknown as 'local',
        linkedAt: new Date(),
        providerUserId: 'x'
      })
    ).toThrow('<UserAuthMethod> does not allow provider <twitter>');
  });

  it('should roundtrip with toPrimitives/fromPrimitives', () => {
    const original = new UserAuthMethod({
      provider: 'facebook',
      providerUserId: 'fb-123',
      linkedAt: new Date()
    });

    const restored = UserAuthMethod.fromPrimitives(original.toPrimitives());

    expect(restored.provider).toBe('facebook');
    expect(restored.providerUserId).toBe('fb-123');
    expect(restored.linkedAt.toISOString()).toBe(original.linkedAt.toISOString());
  });

  it('withPassword should keep linkedAt for local provider', () => {
    const linkedAt = new Date('2026-01-01T00:00:00.000Z');
    const method = UserAuthMethod.local(new PasswordHash(VALID_PASSWORD_HASH), linkedAt);
    const newPassword = new PasswordHash(`$2b$10$${'b'.repeat(53)}`);

    const updatedMethod = method.withPassword(newPassword);

    expect(updatedMethod.password?.value).toBe(newPassword.value);
    expect(updatedMethod.linkedAt.toISOString()).toBe(linkedAt.toISOString());
  });

  it('withPassword should throw for non-local providers', () => {
    const method = new UserAuthMethod({
      provider: 'google',
      providerUserId: 'google-sub-1',
      linkedAt: new Date()
    });

    expect(() => method.withPassword(new PasswordHash(VALID_PASSWORD_HASH))).toThrow(
      'Provider <google> does not support local passwords'
    );
  });
});
