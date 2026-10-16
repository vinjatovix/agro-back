import type { EmailMessagePrimitives } from '../../../shared/application/mailer/index.js';
import { escapeHtml, toHtml, toText } from './emailBody.js';

export const PASSWORD_RESET_SUBJECT = 'Restablece tu contraseña de MiBancal';

export const PASSWORD_RESET_WARNING =
  'Si no has solicitado restablecer tu contraseña, puedes ignorar este correo: tu contraseña no ha cambiado.';

/**
 * The token only travels after `#`: a fragment never reaches servers,
 * proxies or the `Referer` header.
 */
export const passwordResetLink = (baseUrl: string, token: string): string =>
  `${baseUrl}/reset-password#token=${encodeURIComponent(token)}`;

export const passwordResetEmail = ({
  to,
  link
}: {
  to: string;
  link: string;
}): EmailMessagePrimitives => {
  const intro = 'Hola:';
  const action =
    'Para restablecer tu contraseña de MiBancal, abre este enlace:';
  const expiry = 'El enlace caduca en 30 minutos y solo funciona una vez.';
  const safeLink = escapeHtml(link);

  return {
    to,
    subject: PASSWORD_RESET_SUBJECT,
    text: toText([intro, action, link, expiry, PASSWORD_RESET_WARNING]),
    html: toHtml([
      intro,
      action,
      `<a href="${safeLink}">Restablecer mi contraseña</a>`,
      expiry,
      PASSWORD_RESET_WARNING
    ])
  };
};
