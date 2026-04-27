import type { SUPPORTED_AUTH_PROVIDERS } from '../UserAuthMethod.js';

export type AuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];
