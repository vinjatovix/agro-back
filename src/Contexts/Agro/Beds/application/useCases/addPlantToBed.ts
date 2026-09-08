import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { SpatialPlantModel } from '../../domain/services/spatial/interfaces/SpatialPlantModel.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';

export type AddPlantToBedParams = {
  bed: Bed;
  plantInstance: PlantInstance;
  plantRepository: PlantRepository;
  bedRepository: BedRepository;
  user: string;
};

export async function addPlantToBed({
  bed,
  plantInstance,
  plantRepository,
  bedRepository,
  user
}: AddPlantToBedParams): Promise<void> {
  const plantData = await plantRepository.findById(plantInstance.plantId.value);

  const spacingCm = plantData.traits.spacingCm.max;

  const newPlantSpatial: SpatialPlantModel = {
    id: plantInstance.id.value,
    plantId: plantInstance.plantId.value,
    position: {
      x: plantInstance.position.x,
      y: plantInstance.position.y
    },
    spacingCm
  };

  const existingSpatialPlants: SpatialPlantModel[] = await Promise.all(
    bed.plantInstances.map(async (p) => {
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

  const current = bedDomainMapper.toPrimitives(bed);

  bed.addPlant(plantInstance, newPlantSpatial, existingSpatialPlants);
  const updated = bedDomainMapper.toPrimitives(bed);

  await bedRepository.updateWithDiff(current, updated, user);
}
