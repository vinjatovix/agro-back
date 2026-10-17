import type { Email } from '../../../shared/domain/valueObject/index.js';
import { Username } from '../value-objects/index.js';

const FALLBACK_USERNAME = 'user';

/**
 * The username a new provider account tries first: the email's local part with
 * only `[a-z0-9]` kept, `user` when nothing is left, padded with `user` up to
 * the minimum length and cut to the maximum one. Shared by every provider.
 */
export const deriveUsernameBase = (email: Email): string => {
  const localPart = email.value.split('@')[0] ?? '';
  const normalized = localPart.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
  const base = normalized.length > 0 ? normalized : FALLBACK_USERNAME;

  const padded =
    base.length >= Username.MIN_LENGTH
      ? base
      : `${base}${FALLBACK_USERNAME}`.slice(0, Username.MIN_LENGTH);

  return padded.slice(0, Username.MAX_LENGTH);
};

/** `base` cut so that `base + suffix` fits the maximum username length. */
export const usernameWithSuffix = (base: string, suffix: string): Username =>
  new Username(
    `${base.slice(0, Username.MAX_LENGTH - suffix.length)}${suffix}`
  );
