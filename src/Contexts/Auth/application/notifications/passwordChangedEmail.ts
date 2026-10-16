import type { EmailMessagePrimitives } from '../../../shared/application/mailer/index.js';
import { toHtml, toText } from './emailBody.js';

export const PASSWORD_CHANGED_SUBJECT =
  'Tu contraseña de MiBancal ha sido cambiada';

export const PASSWORD_CHANGED_GUIDANCE =
  'Si no has realizado este cambio, ponte en contacto con soporte de inmediato o restablece tu contraseña para proteger tu cuenta.';

export const passwordChangedEmail = ({
  to
}: {
  to: string;
}): EmailMessagePrimitives => {
  const intro = 'Hola:';
  const notice =
    'Te informamos de que la contraseña de tu cuenta de MiBancal ha sido cambiada correctamente.';

  return {
    to,
    subject: PASSWORD_CHANGED_SUBJECT,
    text: toText([intro, notice, PASSWORD_CHANGED_GUIDANCE]),
    html: toHtml([intro, notice, PASSWORD_CHANGED_GUIDANCE])
  };
};
