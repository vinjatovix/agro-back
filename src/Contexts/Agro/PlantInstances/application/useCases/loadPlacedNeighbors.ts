import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { ExistingCropSpatial } from '../../domain/services/CropSpatialService.js';

export type LoadPlacedNeighborsParams = {
  bedId: string;
  userId: string;
  excludeCropId?: string | undefined;
};

/**
 * Active crops of a bed that hold a position, with the spacing of their plant,
 * as the spatial service needs them. Plants are fetched in one query.
 *
 * Plants are only soft-deleted and `findByIds` still returns them, so a
 * neighbor plant is missing only with inconsistent data. Its spacing then
 * counts as 0 and the spacing of the crop being placed decides alone.
 */
export const loadPlacedNeighbors = async (
  plantInstanceRepository: PlantInstanceRepository,
  plantRepository: PlantRepository,
  { bedId, userId, excludeCropId }: LoadPlacedNeighborsParams
): Promise<ExistingCropSpatial[]> => {
  const activeCrops = await plantInstanceRepository.findActiveByBedId(
    bedId,
    userId
  );
  const placedCrops = activeCrops.filter(
    (crop) => crop.position !== undefined && crop.id !== excludeCropId
  );

  const plants = await plantRepository.findByIds([
    ...new Set(placedCrops.map((crop) => crop.plantId))
  ]);
  const spacingByPlantId = new Map(
    plants.map((plant) => [plant.id, plant.traits.spacingCm.max])
  );

  return placedCrops.map((crop) => ({
    id: crop.id,
    position: crop.position && { x: crop.position.x, y: crop.position.y },
    spacingCm: spacingByPlantId.get(crop.plantId) ?? 0
  }));
};
