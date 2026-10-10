import { Coordinates } from '../../../../../shared/domain/value-objects/Coordinates.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { createBedId } from '../../../Beds/domain/BedId.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantInstance } from '../../domain/entities/PlantInstance.js';
import {
  CropGrowthStatus,
  PlantInstanceLifecycleStatus
} from '../../domain/entities/types/index.js';
import { createPlantInstanceId } from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { CropSpatialService } from '../../domain/services/CropSpatialService.js';
import { loadPlacedNeighbors } from './loadPlacedNeighbors.js';

export type PlacePlantInstanceInput = {
  id: string;
  bedId: string;
  plantId: string;
  position?: { x: number; y: number } | undefined;
  growthStatus?: CropGrowthStatus | undefined;
  plantedAt?: string | undefined;
  variety?: string | undefined;
  notes?: string | undefined;
};

export type PlacePlantInstanceDependencies = {
  bedRepository: BedRepository;
  plantRepository: PlantRepository;
  plantInstanceRepository: PlantInstanceRepository;
  cropSpatialService: CropSpatialService;
};

export class PlacePlantInstance {
  private readonly bedRepository: BedRepository;
  private readonly plantRepository: PlantRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly cropSpatialService: CropSpatialService;

  constructor({
    bedRepository,
    plantRepository,
    plantInstanceRepository,
    cropSpatialService
  }: PlacePlantInstanceDependencies) {
    this.bedRepository = bedRepository;
    this.plantRepository = plantRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.cropSpatialService = cropSpatialService;
  }

  async execute(
    input: PlacePlantInstanceInput,
    user: UserSessionInfo
  ): Promise<PlantInstance> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(input.bedId, user.id),
      'Bed',
      input.bedId
    );

    const plant = ensureFound(
      await this.plantRepository.findActiveById(input.plantId),
      'Plant',
      input.plantId
    );

    if (input.position !== undefined) {
      const existingCrops = await loadPlacedNeighbors(
        this.plantInstanceRepository,
        this.plantRepository,
        { bedId: bed.id, userId: user.id }
      );

      this.cropSpatialService.validatePlacement({
        bed: {
          width: bed.width.value,
          height: bed.height.value
        },
        proposed: {
          position: input.position,
          spacingCm: plant.traits.spacingCm.max
        },
        existingCrops
      });
    }

    const plantedAt = input.plantedAt ? new Date(input.plantedAt) : new Date();
    const metadata = Metadata.create(user.username);

    const instance = PlantInstance.create({
      id: createPlantInstanceId(input.id),
      userId: createUserId(user.id),
      bedId: createBedId(bed.id),
      plantId: createPlantId(plant.id),
      position: input.position
        ? new Coordinates(input.position.x, input.position.y)
        : undefined,
      growthStatus: input.growthStatus ?? CropGrowthStatus.PLANTED,
      instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
      plantedAt,
      ...(input.variety !== undefined && { variety: input.variety }),
      ...(input.notes !== undefined && { notes: input.notes }),
      metadata,
      version: 0
    });

    // The entity is built (and its invariants checked) before the bed version
    // is raised, so a rejected crop never invalidates the bed ETag. A taken id
    // still fails after the raise: that needs the transaction of Iteration 24.
    await this.bedRepository.conditionalIncrementVersion(bed.id, bed.version);
    await this.plantInstanceRepository.save(instance);

    return instance;
  }
}
