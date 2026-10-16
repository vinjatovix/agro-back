import type { EmailMessagePrimitives } from '../../../shared/application/mailer/index.js';
import { escapeHtml, toHtml, toText } from './emailBody.js';

export const ACTIVATION_SUBJECT = 'Activa tu cuenta de MiBancal';

export const ACTIVATION_WARNING =
  'Si no has creado esta cuenta, no abras el enlace: alguien ha usado tu email sin tu permiso.';

/**
 * The token only travels after `#`: a fragment never reaches servers,
 * proxies or the `Referer` header.
 */
export const activationLink = (baseUrl: string, token: string): string =>
  `${baseUrl}/activate#token=${encodeURIComponent(token)}`;

export const activationEmail = ({
  to,
  link
}: {
  to: string;
  link: string;
}): EmailMessagePrimitives => {
  const intro = 'Hola:';
  const action = 'Para activar tu cuenta de MiBancal, abre este enlace:';
  const expiry = 'El enlace caduca en 24 horas y solo funciona una vez.';
  const safeLink = escapeHtml(link);

  return {
    to,
    subject: ACTIVATION_SUBJECT,
    text: toText([intro, action, link, expiry, ACTIVATION_WARNING]),
    html: toHtml([
      intro,
      action,
      `<a href="${safeLink}">Activar mi cuenta</a>`,
      expiry,
      ACTIVATION_WARNING
    ])
  };
};
