export const SUPPORTED_AUTH_PROVIDERS = [
  'local',
  'google',
  'github',
  'facebook'
] as const;

export type AuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];
