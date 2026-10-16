export const EMAIL_TOKEN_PURPOSES = ['activation', 'passwordReset'] as const;

export type EmailTokenPurpose = (typeof EMAIL_TOKEN_PURPOSES)[number];

export interface EmailTokenPrimitives {
  purpose: EmailTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
}
