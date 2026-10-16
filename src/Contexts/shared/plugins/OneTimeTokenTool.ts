export interface OneTimeTokenTool {
  /** A new random token and the hash to store in its place. */
  generate(): { token: string; tokenHash: string };
  /** The stored form of `token`, to look it up. */
  hash(token: string): string;
}
