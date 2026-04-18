import { OAuth2Client } from 'google-auth-library';
import { envs } from '../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { Nullable } from '../domain/types/Nullable.js';
import type {
  GoogleIdTokenPayload,
  GoogleIdTokenVerifierTool
} from './GoogleIdTokenVerifierTool.js';

const TEST_TOKEN_PREFIX = 'test-google';

export class GoogleIdTokenVerifierAdapter implements GoogleIdTokenVerifierTool {
  private readonly client = new OAuth2Client(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    envs.GOOGLE_CLIENT_ID || undefined
  );

  async verifyIdToken(
    idToken: string
  ): Promise<Nullable<GoogleIdTokenPayload>> {
    if (envs.NODE_ENV === 'test') {
      return this.verifyTestToken(idToken);
    }

    if (!envs.GOOGLE_CLIENT_ID) {
      return null;
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        audience: envs.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        return null;
      }

      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: Boolean(payload.email_verified),
        ...(payload.name !== undefined && { name: payload.name })
      };
    } catch {
      return null;
    }
  }

  private verifyTestToken(idToken: string): Nullable<GoogleIdTokenPayload> {
    const [prefix, sub, encodedEmail, emailVerified = 'true', encodedName] =
      idToken.split('|');

    if (prefix !== TEST_TOKEN_PREFIX || !sub || !encodedEmail) {
      return null;
    }

    return {
      sub,
      email: decodeURIComponent(encodedEmail),
      emailVerified: emailVerified === 'true',
      ...(encodedName !== undefined && {
        name: decodeURIComponent(encodedName)
      })
    };
  }
}
