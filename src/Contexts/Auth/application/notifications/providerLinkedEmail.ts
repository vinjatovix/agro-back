import type { EmailMessagePrimitives } from '../../../shared/application/mailer/index.js';
import type { AuthProvider } from '../../domain/value-objects/types/index.js';
import { escapeHtml, toHtml, toText } from './emailBody.js';

const PROVIDER_NAMES: Readonly<Record<AuthProvider, string>> = {
  local: 'tu contraseña',
  google: 'Google',
  github: 'GitHub',
  facebook: 'Facebook'
};

const LINK_DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC'
});

export const providerDisplayName = (provider: AuthProvider): string =>
  PROVIDER_NAMES[provider];

export const providerLinkedSubject = (provider: AuthProvider): string =>
  `Se ha vinculado ${providerDisplayName(provider)} a tu cuenta`;

export const providerLinkedEmail = ({
  to,
  provider,
  linkedAt
}: {
  to: string;
  provider: AuthProvider;
  linkedAt: Date;
}): EmailMessagePrimitives => {
  const name = providerDisplayName(provider);
  const date = `${LINK_DATE_FORMAT.format(linkedAt)} (UTC)`;
  const paragraphs = [
    'Hola:',
    `El ${date} se vinculó ${name} a tu cuenta de MiBancal. Desde ahora también puedes iniciar sesión con ${name}.`,
    'Tus accesos anteriores siguen funcionando como hasta ahora.',
    'Si no has sido tú, contacta con el soporte de MiBancal lo antes posible.'
  ];

  return {
    to,
    subject: providerLinkedSubject(provider),
    text: toText(paragraphs),
    html: toHtml(paragraphs.map(escapeHtml))
  };
};
