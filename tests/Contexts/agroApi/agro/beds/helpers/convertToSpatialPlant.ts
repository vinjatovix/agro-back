import type { PlantInstance } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/entities/PlantInstance.js';
import type { SpatialPlantModel } from '../../../../../../src/Contexts/agroApi/agro/beds/domain/services/spatial/interfaces/SpatialPlantModel.js';

export function convertToSpatialPlant(
  p: PlantInstance,
  spacingCm: number
): SpatialPlantModel {
  return {
    id: p.id.value,
    plantId: p.plantId.value,
    position: {
      x: p.position.x,
      y: p.position.y
    },
    spacingCm
  };
}
