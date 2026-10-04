import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type {
  FamilySummaryReader,
  FamilySummaryView,
  PlantField,
  PlantRelation,
  PlantSparseView
} from '../queries/index.js';

/**
 * Whether a read asks for the family and keeps the field it goes into: with a
 * fieldset that leaves out `identity`, there is nothing to embed into.
 */
export const embedsFamily = ({
  include,
  fields
}: ReadOptions<PlantField, PlantRelation>): boolean =>
  (include?.includes('family') ?? false) &&
  (fields === undefined || fields.includes('identity'));

const familyIdOf = (view: PlantSparseView): string | undefined => {
  const family = view.identity?.family;

  return typeof family === 'string' ? family : undefined;
};

const withFamily = (
  view: PlantSparseView,
  summaries: ReadonlyMap<string, FamilySummaryView>
): PlantSparseView => {
  const familyId = familyIdOf(view);
  const family = familyId === undefined ? undefined : summaries.get(familyId);

  return view.identity && family
    ? { ...view, identity: { ...view.identity, family } }
    : view;
};

/**
 * Replaces each plant's family id with the family summary, reading every
 * family of the page in one call. A family that is not found (or whose id is
 * not a UUID, so it cannot be stored as one) keeps the plain id.
 */
export const embedFamilySummaries = async (
  views: readonly PlantSparseView[],
  reader: FamilySummaryReader
): Promise<PlantSparseView[]> => {
  const ids = [
    ...new Set(views.map(familyIdOf).filter((id) => id !== undefined))
  ].filter((id) => UuidValidator.isValid(id));

  if (ids.length === 0) return [...views];

  const summaries = new Map(
    (await reader.findSummariesByIds(ids)).map((summary) => [
      summary.id,
      summary
    ])
  );

  return views.map((view) => withFamily(view, summaries));
};
