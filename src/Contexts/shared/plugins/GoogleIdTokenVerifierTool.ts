import type { Nullable } from '../domain/types/Nullable.js';

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface GoogleIdTokenVerifierTool {
  verifyIdToken(idToken: string): Promise<Nullable<GoogleIdTokenPayload>>;
}