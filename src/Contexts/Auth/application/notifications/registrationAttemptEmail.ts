import type { EmailMessagePrimitives } from '../../../shared/application/mailer/index.js';
import { toHtml, toText } from './emailBody.js';

export const REGISTRATION_ATTEMPT_SUBJECT =
  'Alguien ha intentado registrarse con tu email';

// Valid for every account, with or without a password (e.g. Google only).
export const REGISTRATION_ATTEMPT_GUIDANCE =
  'Si fuiste tú, ya tienes cuenta: inicia sesión como lo haces habitualmente. Si no, no tienes que hacer nada.';

export const registrationAttemptEmail = ({
  to
}: {
  to: string;
}): EmailMessagePrimitives => {
  const paragraphs = [
    'Hola:',
    'Alguien ha intentado crear una cuenta de MiBancal con este email. No se ha creado ninguna cuenta y la tuya no ha cambiado.',
    REGISTRATION_ATTEMPT_GUIDANCE
  ];

  return {
    to,
    subject: REGISTRATION_ATTEMPT_SUBJECT,
    text: toText(paragraphs),
    html: toHtml(paragraphs)
  };
};
