import {
  activationEmail,
  activationLink,
  PASSWORD_CHANGED_GUIDANCE,
  PASSWORD_CHANGED_SUBJECT,
  PASSWORD_RESET_SUBJECT,
  PASSWORD_RESET_WARNING,
  passwordChangedEmail,
  passwordResetEmail,
  passwordResetLink,
  providerLinkedEmail,
  REGISTRATION_ATTEMPT_GUIDANCE,
  registrationAttemptEmail
} from '../../../../../src/Contexts/Auth/application/notifications/index.js';
import { EmailMessage } from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { OneTimeTokenAdapter } from '../../../../../src/Contexts/shared/plugins/OneTimeTokenAdapter.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';

const BASE_URL = 'https://app.example.com';
// Shape of a generated token: 43 base64url characters.
const TOKEN_SHAPE = /[A-Za-z0-9_-]{43}/;

describe('account emails', () => {
  const to = EmailMother.random().value;
  const { token } = new OneTimeTokenAdapter().generate();

  describe('activation', () => {
    const link = activationLink(BASE_URL, token);
    const message = activationEmail({ to, link });

    it('should be a valid message with the exact subject', () => {
      expect(() => EmailMessage.create(message)).not.toThrow();
      expect(message.subject).toBe('Activa tu cuenta de MiBancal');
    });

    it('should carry the token only after `#` in the activation link', () => {
      expect(link).toBe(`${BASE_URL}/activate#token=${token}`);
      expect(link.split('#')[0]).not.toContain(token);
      expect(message.text).toContain(link);
      expect(message.html).toContain(link);
    });

    it('should say it expires in 24 hours and works once', () => {
      expect(message.text).toMatch(/24 horas/);
      expect(message.text).toMatch(/solo funciona una vez/);
    });

    it('should include the warning for owners who did not register', () => {
      const warning =
        'Si no has creado esta cuenta, no abras el enlace: alguien ha usado tu email sin tu permiso.';

      expect(message.text).toContain(warning);
      expect(message.html).toContain(warning);
    });
  });

  describe('passwordReset', () => {
    const link = passwordResetLink(BASE_URL, token);
    const message = passwordResetEmail({ to, link });

    it('should be a valid message with the exact subject', () => {
      expect(() => EmailMessage.create(message)).not.toThrow();
      expect(message.subject).toBe(PASSWORD_RESET_SUBJECT);
    });

    it('should carry the token only after `#` in the reset link', () => {
      expect(link).toBe(`${BASE_URL}/reset-password#token=${token}`);
      expect(link.split('#')[0]).not.toContain(token);
      expect(message.text).toContain(link);
      expect(message.html).toContain(link);
    });

    it('should say it expires in 30 minutes and works once', () => {
      expect(message.text).toMatch(/30 minutos/);
      expect(message.text).toMatch(/solo funciona una vez/);
    });

    it('should include the warning for recipients who did not request it', () => {
      expect(message.text).toContain(PASSWORD_RESET_WARNING);
      expect(message.html).toContain(PASSWORD_RESET_WARNING);
    });
  });

  describe('passwordChanged', () => {
    const message = passwordChangedEmail({ to });

    it('should be a valid message with the exact subject', () => {
      expect(() => EmailMessage.create(message)).not.toThrow();
      expect(message.subject).toBe(PASSWORD_CHANGED_SUBJECT);
    });

    it('should inform the user that the password was changed', () => {
      expect(message.text).toMatch(/ha sido cambiada correctamente/);
    });

    it('should provide security guidance to contact support or reset', () => {
      expect(message.text).toContain(PASSWORD_CHANGED_GUIDANCE);
    });

    it('should contain no token and no link', () => {
      expect(message.text).not.toMatch(TOKEN_SHAPE);
      expect(message.text).not.toMatch(/https?:\/\//);
      expect(message.html).not.toMatch(/<a /);
    });
  });

  describe('registrationAttempt', () => {
    const message = registrationAttemptEmail({ to });

    it('should be a valid message with the exact subject', () => {
      expect(() => EmailMessage.create(message)).not.toThrow();
      expect(message.subject).toBe(
        'Alguien ha intentado registrarse con tu email'
      );
    });

    it('should say that nothing was created or changed', () => {
      expect(message.text).toMatch(/No se ha creado ninguna cuenta/);
      expect(message.text).toMatch(/no ha cambiado/);
    });

    it('should give the neutral guidance and never mention the password', () => {
      expect(message.text).toContain(REGISTRATION_ATTEMPT_GUIDANCE);
      expect(message.text).not.toMatch(/contraseña/i);
    });

    it('should contain no token and no link', () => {
      expect(message.text).not.toMatch(TOKEN_SHAPE);
      expect(message.text).not.toMatch(/https?:\/\//);
      expect(message.html).not.toMatch(/<a /);
    });
  });

  describe('providerLinked', () => {
    const linkedAt = new Date('2026-10-16T09:05:00.000Z');
    const message = providerLinkedEmail({ to, provider: 'google', linkedAt });

    it('should name the provider in the subject', () => {
      expect(() => EmailMessage.create(message)).not.toThrow();
      expect(message.subject).toBe('Se ha vinculado Google a tu cuenta');
    });

    it('should give the date of the link', () => {
      expect(message.text).toContain('16 de octubre de 2026');
    });

    it('should say the password still works and to contact support otherwise', () => {
      expect(message.text).toMatch(/contraseña sigue funcionando/);
      expect(message.text).toMatch(/soporte/);
    });

    it('should contain no token', () => {
      expect(message.text).not.toMatch(TOKEN_SHAPE);
    });
  });
});
