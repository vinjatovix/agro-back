export type Resource = 'bed' | 'plant' | 'family';

/** Raw collection and World id field behind each `{resource}` step parameter. */
export const RESOURCES: Readonly<
  Record<
    Resource,
    { collection: string; idKey: 'bedId' | 'plantId' | 'familyId' }
  >
> = {
  bed: { collection: 'beds', idKey: 'bedId' },
  plant: { collection: 'plants', idKey: 'plantId' },
  family: { collection: 'families', idKey: 'familyId' }
};
