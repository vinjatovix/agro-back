import {
  deriveUsernameBase,
  usernameWithSuffix
} from '../../../../src/Contexts/Auth/domain/services/googleUsernameCandidates.js';
import { Username } from '../../../../src/Contexts/Auth/domain/value-objects/index.js';
import { EmailMother } from '../../shared/domain/mothers/EmailMother.js';

const LONG_BASE = 'averyveryverylongnam';

describe('googleUsernameCandidates', () => {
  describe('deriveUsernameBase', () => {
    it.each([
      ['maria.lopez@example.com', 'marialopez'],
      ['Ana.Maria+News@example.com', 'anamarianews'],
      ['ana@example.com', 'anau'],
      ['+++@example.com', 'user'],
      ['averyveryverylongname123@example.com', LONG_BASE]
    ])('should derive %s as %s', (email, expected) => {
      expect(deriveUsernameBase(EmailMother.create(email))).toBe(expected);
    });

    it('should always answer a valid username', () => {
      const base = deriveUsernameBase(EmailMother.random());

      expect(new Username(base).value).toBe(base);
    });
  });

  describe('usernameWithSuffix', () => {
    it('should append the suffix to a short base', () => {
      expect(usernameWithSuffix('anau', '4821').value).toBe('anau4821');
    });

    it.each([
      ['4821', 'averyveryverylon4821'],
      ['9f3c01ab', 'averyveryver9f3c01ab']
    ])('should cut a long base so the suffix %s fits', (suffix, expected) => {
      const username = usernameWithSuffix(LONG_BASE, suffix);

      expect(username.value).toBe(expected);
      expect(username.value).toHaveLength(Username.MAX_LENGTH);
    });
  });
});
