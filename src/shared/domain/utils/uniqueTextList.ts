import { InvalidArgumentException } from '../../../Contexts/shared/domain/errors/index.js';

/**
 * A list of texts without blanks or repeats: every entry is trimmed, blank
 * entries are dropped and entries already seen (ignoring letter case) are
 * dropped, keeping the first occurrence as sent. `path` names the list in the
 * error raised for a non-string entry (`Family.aliases.1`).
 */
export const uniqueTextList = (
  values: readonly unknown[],
  path: string
): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value, index) => {
    if (typeof value !== 'string') {
      throw new InvalidArgumentException(`${path}.${index} must be a text`);
    }
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });

  return result;
};
