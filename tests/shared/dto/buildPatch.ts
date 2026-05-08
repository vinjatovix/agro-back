import { isObject } from '../../../src/shared/domain/patch/utils/isObject.js';

export function buildPatch(
  overrides: Record<string, unknown>
): Record<string, unknown> {
  let result: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(overrides)) {
    result = applyPath(result, path, value);
  }

  return result;
}

function applyPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };

  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;

    const next = current[key];

    if (!isObject(next)) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  current[keys.at(-1)!] = value;

  return result;
}
