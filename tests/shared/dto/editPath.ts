import { isRecord } from '../../../src/shared/domain/utils/isRecord.js';

type Body = Record<string, unknown>;

/** Copies `body` down `path`, so editing its last key leaves `body` intact. */
const copyAlong = (body: Body, keys: string[]): [Body, Body] => {
  const root: Body = { ...body };
  let current = root;

  for (const key of keys.slice(0, -1)) {
    const next = current[key];
    if (!isRecord(next)) {
      throw new Error(`editPath: "${key}" is not an object in this body`);
    }
    current[key] = { ...next };
    current = current[key] as Body;
  }

  return [root, current];
};

/** A copy of `body` with the dotted `path` (`identity.name.primary`) set. */
export const withPath = (body: Body, path: string, value: unknown): Body => {
  const keys = path.split('.');
  const [root, parent] = copyAlong(body, keys);
  parent[keys.at(-1)!] = value;
  return root;
};

/** A copy of `body` without the dotted `path`. */
export const withoutPath = (body: Body, path: string): Body => {
  const keys = path.split('.');
  const [root, parent] = copyAlong(body, keys);
  delete parent[keys.at(-1)!];
  return root;
};
