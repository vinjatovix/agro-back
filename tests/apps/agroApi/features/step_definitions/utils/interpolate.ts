import { isPrimitive } from '../../../../../../src/shared/domain/patch/utils/isPrimitive.js';

const interpolate = <T extends Record<string, unknown>>(
  input: unknown,
  world: T
): unknown => {
  if (typeof input === 'string') {
    return input.replace(/{([^{}]+)}/g, (_, key: string) => {
      const value = world[key];

      if (value === undefined || value === null) {
        throw new Error(`Missing value for param: ${key}`);
      }

      if (!isPrimitive(value)) {
        throw new Error(`Invalid primitive interpolation for key: ${key}`);
      }

      return String(value);
    });
  }

  if (Array.isArray(input)) {
    return input.map((v) => interpolate(v, world));
  }

  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      out[key] = interpolate(obj[key], world);
    }

    return out;
  }

  return input;
};

export const interpolateRoute = <T extends Record<string, unknown>>(
  route: string,
  world: T
): string =>
  route.replaceAll(/{([^{}]+)}/g, (_, key: string) => {
    const value = world[key];

    if (value === undefined || value === null) {
      throw new Error(`Missing route param: ${key}`);
    }

    if (!isPrimitive(value)) {
      throw new Error(`Invalid route param type for ${key}`);
    }

    return String(value);
  });

export const interpolateJson = <T extends Record<string, unknown>>(
  body: string,
  world: T
): string => {
  const parsed = JSON.parse(body) as unknown;
  return JSON.stringify(interpolate(parsed, world));
};
