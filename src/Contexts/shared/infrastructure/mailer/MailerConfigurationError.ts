export const SUPPORTED_MODES = ['development', 'test', 'production'] as const;

const EXPECTED_SETTING = {
  MAIL_FROM_ADDRESS: 'a valid email address',
  MAIL_FROM_NAME: 'a display name without line breaks',
  MAIL_SEND_TIMEOUT_MS: 'a number of milliseconds within 1–10000'
} as const;

/**
 * Start-up failure of the mail settings. It never reaches HTTP: `index.ts`
 * logs it and exits. Messages name variables, never their values.
 */
export class MailerConfigurationError extends Error {
  public override readonly name = 'MailerConfigurationError';

  private constructor(message: string) {
    super(message);
  }

  static missingSetting(
    name: 'RESEND_API_KEY' | 'MAIL_FROM_ADDRESS'
  ): MailerConfigurationError {
    return new MailerConfigurationError(
      `Missing setting '${name}': real email delivery cannot start without it.`
    );
  }

  static invalidSetting(
    name: keyof typeof EXPECTED_SETTING
  ): MailerConfigurationError {
    return new MailerConfigurationError(
      `Invalid setting '${name}': expected ${EXPECTED_SETTING[name]}.`
    );
  }

  static unsupportedMode(nodeEnv: string): MailerConfigurationError {
    return new MailerConfigurationError(
      `Unsupported NODE_ENV '${nodeEnv}': expected one of ${SUPPORTED_MODES.join(', ')}.`
    );
  }
}
