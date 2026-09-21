import type { SpatialPlantModel } from '../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/SpatialPlantModel.js';
import type { PlantInstance } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';

export function convertToSpatialPlant(
  p: PlantInstance,
  spacingCm: number
): SpatialPlantModel {
  return {
    id: p.id,
    plantId: p.plantId,
    position: {
      x: p.position.x,
      y: p.position.y
    },
    spacingCm
  };
}
