import { isObject } from '../patch/utils/isObject.js';
import type { UnknownRecord } from '../types/UnknownRecord.js';
import { resolveDiffAction } from './resolveDiffAction.js';
import { walkDiff } from './walkDiff.js';

export type DiffResult = {
  set: UnknownRecord;
  unset: Record<string, ''>;
};

export function diffObjects(
  current: UnknownRecord,
  updated: UnknownRecord,
  parentPath = ''
): DiffResult {
  const set: UnknownRecord = {};
  const unset: Record<string, ''> = {};

  walkDiff(current, updated, parentPath, (key, c, u, path) => {
    const action = resolveDiffAction(c, u);

    switch (action) {
      case 'noop':
        return;

      case 'unset':
        unset[path] = '';
        return;

      case 'set':
      case 'replace':
        if (isObject(c) && isObject(u)) {
          const nested = diffObjects(c, u, path);
          Object.assign(set, nested.set);
          Object.assign(unset, nested.unset);
        } else {
          set[path] = u;
        }
    }
  });

  return { set, unset };
}
