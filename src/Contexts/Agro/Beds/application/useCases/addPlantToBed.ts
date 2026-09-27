import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import type { SpatialPlantModel } from '../../domain/services/spatial/interfaces/SpatialPlantModel.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';

export type AddPlantToBedParams = {
  bedId: string;
  plantInstance: PlantInstance;
  plantRepository: PlantRepository;
  bedRepository: BedRepository;
  user: UserSessionInfo;
};

export async function addPlantToBed({
  bedId,
  plantInstance,
  plantRepository,
  bedRepository,
  user
}: AddPlantToBedParams): Promise<void> {
  const bed = ensureFound(
    await bedRepository.findOwnedActiveById(bedId, user.id),
    'Bed',
    bedId
  );

  const plantData = ensureFound(
    await plantRepository.findActiveById(plantInstance.plantId),
    'Plant',
    plantInstance.plantId
  );

  const spacingCm = plantData.traits.spacingCm.max;

  const newPlantSpatial: SpatialPlantModel = {
    id: plantInstance.id,
    plantId: plantInstance.plantId,
    position: {
      x: plantInstance.position.x,
      y: plantInstance.position.y
    },
    spacingCm
  };

  const existingSpatialPlants: SpatialPlantModel[] = await Promise.all(
    bed.plantInstances.map(async (p) => {
      const data = ensureFound(
        await plantRepository.findById(p.plantId),
        'Plant',
        p.plantId
      );

      return {
        id: p.id,
        plantId: p.plantId,
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

  await bedRepository.updateWithDiff(current, updated, user.username);
}
