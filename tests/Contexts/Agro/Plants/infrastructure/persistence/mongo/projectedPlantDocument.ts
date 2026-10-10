import type { StoredPlantDocument } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.js';
import type { MongoPlantDocument } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/types/MongoPlantDocument.js';

/**
 * A stored plant as the read projection returns it, with the computed `image`
 * (its first image resource, or `null`), for tests that do not hit MongoDB.
 * The repository integration test checks the real projection gives the same.
 */
export const projectedPlantDocument = (
  document: MongoPlantDocument
): StoredPlantDocument => ({
  ...document,
  image:
    document.knowledge?.resources?.find(
      (resource) => resource.type === 'image'
    ) ?? null
});
