import type { FamilyReadView } from '../../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import { FamilyReadViewMother } from '../../../../../Contexts/Agro/Families/application/queries/FamilyReadViewMother.js';
import { cloneView } from '../../shared/cloneView.js';

/** A family read view with every optional field. */
export const fullFamilyView = (): FamilyReadView =>
  FamilyReadViewMother.withExtra();

/** A family read view without `extra`. */
export const baseFamilyView = (): FamilyReadView => FamilyReadViewMother.base();

/** `view` with the top-level or `extra.` key `path` set to `value`. */
export const withValueAt = (
  view: FamilyReadView,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const copy = cloneView(view);
  const [first, second] = path.split('.') as [string, string | undefined];

  if (second === undefined) {
    copy[first] = value;
  } else {
    (copy[first] as Record<string, unknown>)[second] = value;
  }

  return copy;
};

/** `view` without the top-level key `key`. */
export const withoutKey = (
  view: FamilyReadView,
  key: keyof FamilyReadView
): Record<string, unknown> => {
  const copy = cloneView(view);
  delete copy[key];

  return copy;
};
