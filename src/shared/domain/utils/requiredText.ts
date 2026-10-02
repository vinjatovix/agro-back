import { InvalidArgumentException } from '../../../Contexts/shared/domain/errors/index.js';

/**
 * A required text: trimmed and never blank. `path` names the field in the
 * error (`identity.name.primary`).
 */
export const requiredText = (value: string, path: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new InvalidArgumentException(`${path} cannot be empty`);
  }
  return trimmed;
};
