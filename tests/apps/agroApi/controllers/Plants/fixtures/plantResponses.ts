import type { PlantReadView } from '../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import { PlantReadViewMother } from '../../../../../Contexts/Agro/Plants/application/queries/PlantReadViewMother.js';
import { PlantFactory } from '../../../../../Contexts/Agro/Plants/domain/mothers/PlantFactory.js';
import { PlantIdentityBuilder } from '../../../../../Contexts/Agro/Plants/domain/mothers/PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from '../../../../../Contexts/Agro/Plants/domain/mothers/PlantKnowledgeBuilder.js';
import { cloneView } from '../../shared/cloneView.js';

/** A read view using every optional plant field. */
export const fullPlantView = (): PlantReadView =>
  PlantReadViewMother.from(
    PlantFactory.full({
      identity: PlantIdentityBuilder.withAliases(),
      knowledge: PlantKnowledgeBuilder.full()
    })
  );

/** A read view with no optional field (no aliases, empty knowledge). */
export const minimalPlantView = (): PlantReadView =>
  PlantReadViewMother.from(PlantFactory.create());

/** `view` with `path` (dot separated) replaced by `value`. */
export const withValueAt = (
  view: PlantReadView,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const copy = cloneView(view);
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = copy;

  for (const key of keys) {
    target = target[key] as Record<string, unknown>;
  }

  target[last] = value;

  return copy;
};

/** `view` without the key at `path` (dot separated). */
export const withoutKeyAt = (
  view: PlantReadView,
  path: string
): Record<string, unknown> => {
  const copy = withValueAt(view, path, undefined);
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = copy;

  for (const key of keys) {
    target = target[key] as Record<string, unknown>;
  }

  delete target[last];

  return copy;
};
