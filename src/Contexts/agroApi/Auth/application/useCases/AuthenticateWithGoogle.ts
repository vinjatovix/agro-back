import { createError } from '../../../../../shared/errors/index.js';
import {
  Email,
  Metadata,
  Uuid
} from '../../../../shared/domain/valueObject/index.js';
import type {
  EncrypterTool,
  GoogleIdTokenVerifierTool
} from '../../../../shared/plugins/index.js';
import { buildLogger } from '../../../../shared/plugins/logger.plugin.js';
import {
  User,
  UserAuthMethod,
  UserPatch,
  Username,
  UserRoles
} from '../../domain/index.js';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { AuthenticateWithGoogleRequest } from '../interfaces/index.js';

const logger = buildLogger('authenticateWithGoogle');
const INVALID_GOOGLE_TOKEN_MESSAGE = 'Invalid Google token';
const TOKEN_GENERATION_ERROR_MESSAGE =
  'Failed to generate authentication token';

export class AuthenticateWithGoogle {
  constructor(
    private readonly repository: UserRepository,
    private readonly encrypter: EncrypterTool,
    private readonly googleIdTokenVerifier: GoogleIdTokenVerifierTool
  ) {}

  async run({ idToken }: AuthenticateWithGoogleRequest): Promise<string> {
    const tokenPayload =
      await this.googleIdTokenVerifier.verifyIdToken(idToken);

    if (!tokenPayload?.email || !tokenPayload?.sub) {
      throw createError.auth(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    if (!tokenPayload.emailVerified) {
      throw createError.auth(INVALID_GOOGLE_TOKEN_MESSAGE);
    }

    const user = await this.resolveUser(tokenPayload.email, tokenPayload.sub);
    return this.generateAuthToken(user);
  }

  private async resolveUser(
    email: string,
    providerUserId: string
  ): Promise<User> {
    const existingByProvider = await this.repository.searchByProvider(
      'google',
      providerUserId
    );

    if (existingByProvider) {
      logger.info(
        `User <${existingByProvider.username.value}> logged in with Google`
      );
      return existingByProvider;
    }

    const existingByEmail = await this.repository.search(email);
    if (existingByEmail) {
      const linkedMethod = existingByEmail.findAuthMethod('google');
      if (linkedMethod && linkedMethod.providerUserId !== providerUserId) {
        throw createError.auth(INVALID_GOOGLE_TOKEN_MESSAGE);
      }

      if (!linkedMethod) {
        await this.linkGoogleMethod(existingByEmail, providerUserId);
      }

      logger.info(
        `User <${existingByEmail.username.value}> linked Google authentication`
      );
      return existingByEmail;
    }

    return this.createGoogleUser(email, providerUserId);
  }

  private async linkGoogleMethod(
    user: User,
    providerUserId: string
  ): Promise<void> {
    const linkedAt = new Date();
    const userPatch = new UserPatch({
      id: user.id,
      ...(user.emailValidated ? {} : { emailValidated: true }),
      authMethods: [
        ...user.authMethods,
        new UserAuthMethod({
          provider: 'google',
          providerUserId,
          linkedAt
        })
      ]
    });

    await this.repository.update(userPatch, user.username);
  }

  private async createGoogleUser(
    email: string,
    providerUserId: string
  ): Promise<User> {
    const username = this.deriveUsernameFromEmail(email);
    const date = new Date();

    const user = new User({
      id: Uuid.random(),
      email: new Email(email),
      username,
      emailValidated: true,
      authMethods: [
        new UserAuthMethod({
          provider: 'google',
          providerUserId,
          linkedAt: date
        })
      ],
      roles: new UserRoles(['user']),
      metadata: new Metadata({
        createdAt: date,
        createdBy: username.value,
        updatedAt: date,
        updatedBy: username.value
      })
    });

    await this.repository.save(user);
    logger.info(
      `Created user <${user.username.value}> with Google authentication`
    );

    return user;
  }

  private deriveUsernameFromEmail(email: string): Username {
    const localPart = email.split('@')[0] ?? '';
    const normalized = localPart.replaceAll(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const minLength = Username.MIN_LENGTH;
    const maxLength = Username.MAX_LENGTH;
    const fallback = 'user';
    const base = normalized.length > 0 ? normalized : fallback;

    const padded =
      base.length >= minLength
        ? base
        : `${base}${fallback}`.slice(0, minLength);

    return new Username(padded.slice(0, maxLength));
  }

  private async generateAuthToken(user: User): Promise<string> {
    const token = await this.encrypter.generateToken({
      id: user.id.value,
      email: user.email.value,
      username: user.username.value,
      roles: user.roles.value
    });

    if (!token) {
      throw createError.auth(TOKEN_GENERATION_ERROR_MESSAGE);
    }

    return token;
  }
}
