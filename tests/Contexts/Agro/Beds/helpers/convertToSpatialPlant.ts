import type { SpatialPlantModel } from '../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';
import type { PlantInstance } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

export function convertToSpatialPlant(
  p: PlantInstance,
  spacingCm: number
): SpatialPlantModel {
  const { position } = p;
  if (position === undefined) {
    throw new InvalidArgumentException(
      'convertToSpatialPlant needs a crop with a position'
    );
  }

  return {
    id: p.id,
    plantId: p.plantId,
    position: {
      x: position.x,
      y: position.y
    },
    spacingCm
  };
}
