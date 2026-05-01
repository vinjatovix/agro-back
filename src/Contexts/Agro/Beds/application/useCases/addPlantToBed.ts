import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { SpatialPlantModel } from '../../domain/services/spatial/interfaces/SpatialPlantModel.js';

export async function addPlantToBed(
  bed: Bed,
  plant: PlantInstance,
  plantRepository: PlantRepository
): Promise<void> {
  const plantData = await plantRepository.findById(plant.plantId.value);

  const spacingCm = plantData.traits.spacingCm.max;

  const newPlantSpatial: SpatialPlantModel = {
    id: plant.id.value,
    plantId: plant.plantId.value,
    position: {
      x: plant.position.x,
      y: plant.position.y
    },
    spacingCm
  };

  const existingSpatialPlants: SpatialPlantModel[] = await Promise.all(
    bed.plants.map(async (p) => {
      const data = await plantRepository.findById(p.plantId.value);

      return {
        id: p.id.value,
        plantId: p.plantId.value,
        position: {
          x: p.position.x,
          y: p.position.y
        },
        spacingCm: data.traits.spacingCm.max
      };
    })
  );

  bed.addPlant(plant, newPlantSpatial, existingSpatialPlants);
}
