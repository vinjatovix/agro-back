import type { AuthProvider } from './AuthProvider.js';

export type UserAuthMethodPrimitives = {
  provider: AuthProvider;
  linkedAt: Date;
  providerUserId?: string;
  password?: string;
};
