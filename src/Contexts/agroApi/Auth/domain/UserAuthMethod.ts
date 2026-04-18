import { createError } from '../../../../shared/errors/index.js';
import { PasswordHash } from '../../../shared/domain/valueObject/index.js';

export const SUPPORTED_AUTH_PROVIDERS = [
  'local',
  'google',
  'github',
  'facebook'
] as const;

export type AuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

export type UserAuthMethodPrimitives = {
  provider: AuthProvider;
  linkedAt: Date;
  providerUserId?: string;
  password?: string;
};

export class UserAuthMethod {
  readonly provider: AuthProvider;
  readonly linkedAt: Date;
  readonly providerUserId?: string;
  readonly password?: PasswordHash;

  constructor({
    provider,
    linkedAt,
    providerUserId,
    password
  }: {
    provider: AuthProvider;
    linkedAt: Date;
    providerUserId?: string;
    password?: PasswordHash;
  }) {
    UserAuthMethod.ensureProviderIsSupported(provider);

    this.provider = provider;
    this.linkedAt = linkedAt;

    if (providerUserId !== undefined) {
      this.providerUserId = providerUserId;
    }

    if (password !== undefined) {
      this.password = password;
    }

    this.ensureIsValid();
  }

  static local(password: PasswordHash, linkedAt: Date): UserAuthMethod {
    return new UserAuthMethod({
      provider: 'local',
      password,
      linkedAt
    });
  }

  static fromPrimitives({
    provider,
    linkedAt,
    providerUserId,
    password
  }: UserAuthMethodPrimitives): UserAuthMethod {
    return new UserAuthMethod({
      provider,
      linkedAt: new Date(linkedAt),
      ...(providerUserId !== undefined && { providerUserId }),
      ...(password !== undefined && { password: new PasswordHash(password) })
    });
  }

  isLocal(): boolean {
    return this.provider === 'local';
  }

  withPassword(password: PasswordHash): UserAuthMethod {
    if (!this.isLocal()) {
      throw createError.badRequest(
        `Provider <${this.provider}> does not support local passwords`
      );
    }

    return UserAuthMethod.local(password, this.linkedAt);
  }

  toPrimitives(): UserAuthMethodPrimitives {
    return {
      provider: this.provider,
      linkedAt: this.linkedAt,
      ...(this.providerUserId !== undefined && {
        providerUserId: this.providerUserId
      }),
      ...(this.password !== undefined && { password: this.password.value })
    };
  }

  private ensureIsValid(): void {
    if (this.isLocal() && this.password === undefined) {
      throw createError.badRequest(
        '<UserAuthMethod> local provider requires a password hash'
      );
    }

    if (!this.isLocal() && this.providerUserId === undefined) {
      throw createError.badRequest(
        `<UserAuthMethod> provider <${this.provider}> requires a providerUserId`
      );
    }
  }

  private static ensureProviderIsSupported(provider: string): void {
    if (!SUPPORTED_AUTH_PROVIDERS.includes(provider as AuthProvider)) {
      throw createError.badRequest(
        `<UserAuthMethod> does not allow provider <${provider}>`
      );
    }
  }
}