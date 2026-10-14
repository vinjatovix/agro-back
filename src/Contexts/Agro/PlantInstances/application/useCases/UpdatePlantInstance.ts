import { Coordinates } from '../../../../../shared/domain/value-objects/Coordinates.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { WriteOutcome } from '../../../../shared/domain/repositories/WriteOutcome.js';
import type { Bed } from '../../../Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type {
  CropGrowthStatus,
  PlantInstanceDetailChanges,
  PlantInstancePrimitives
} from '../../domain/entities/types/index.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { CropSpatialService } from '../../domain/services/CropSpatialService.js';
import { loadPlacedNeighbors } from './loadPlacedNeighbors.js';

export type UpdatePlantInstanceInput = {
  id: string;
  position?: { x: number; y: number } | undefined;
  growthStatus?: CropGrowthStatus | undefined;
  variety?: string | null | undefined;
  notes?: string | null | undefined;
};

export type UpdatePlantInstanceDependencies = {
  bedRepository: BedRepository;
  plantRepository: PlantRepository;
  plantInstanceRepository: PlantInstanceRepository;
  cropSpatialService: CropSpatialService;
  unitOfWork: UnitOfWork;
};

function extractDetailChanges(
  input: UpdatePlantInstanceInput
): PlantInstanceDetailChanges {
  return {
    growthStatus: input.growthStatus,
    variety: input.variety,
    notes: input.notes
  };
}

export class UpdatePlantInstance {
  private readonly bedRepository: BedRepository;
  private readonly plantRepository: PlantRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly cropSpatialService: CropSpatialService;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    bedRepository,
    plantRepository,
    plantInstanceRepository,
    cropSpatialService,
    unitOfWork
  }: UpdatePlantInstanceDependencies) {
    this.bedRepository = bedRepository;
    this.plantRepository = plantRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.cropSpatialService = cropSpatialService;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    input: UpdatePlantInstanceInput,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<PlantInstance> {
    const crop = ensureFound(
      await this.plantInstanceRepository.findOwnedActiveById(input.id, user.id),
      'PlantInstance',
      input.id
    );
    ensureVersion(crop.version, expectedVersions, 'PlantInstance', input.id);

    const currentPrimitives = crop.toPrimitives();
    const at = new Date();

    const movedInBed =
      input.position !== undefined
        ? await this.moveIfChanged(crop, input.position, user, at)
        : undefined;

    crop.updateDetails(extractDetailChanges(input), user.username, at);

    const updatedPrimitives = crop.toPrimitives();

    const outcome = await this.persist(
      currentPrimitives,
      updatedPrimitives,
      movedInBed
    );

    // Outside the unit: `work` may be retried, and syncing inside it would
    // raise the in-memory version once per attempt.
    crop.syncVersion(outcome);

    return crop;
  }

  /**
   * Every rule has passed. A move raises the bed version and writes the crop
   * together or not at all, so a rejected request never invalidates the bed
   * ETag; a details-only edit touches the crop alone and needs no unit.
   */
  private async persist(
    current: PlantInstancePrimitives,
    updated: PlantInstancePrimitives,
    movedInBed: Bed | undefined
  ): Promise<WriteOutcome> {
    if (movedInBed === undefined) {
      return this.plantInstanceRepository.updateWithDiff(current, updated);
    }

    return this.unitOfWork.run(async () => {
      await this.bedRepository.conditionalIncrementVersion(
        movedInBed.id,
        movedInBed.version
      );

      return this.plantInstanceRepository.updateWithDiff(current, updated);
    });
  }

  /**
   * Validates and applies a move in memory. Returns the bed whose version
   * must be raised, or `undefined` when the crop stays where it is.
   */
  private async moveIfChanged(
    crop: PlantInstance,
    position: { x: number; y: number },
    user: UserSessionInfo,
    at: Date
  ): Promise<Bed | undefined> {
    const isPositionChanged =
      !crop.position ||
      crop.position.x !== position.x ||
      crop.position.y !== position.y;

    if (!isPositionChanged) {
      return undefined;
    }

    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(crop.bedId, user.id),
      'Bed',
      crop.bedId
    );

    // Not `findActiveById`: the crop already exists, and a plant soft-deleted
    // from the catalog afterwards must not keep it from moving.
    const plant = ensureFound(
      await this.plantRepository.findById(crop.plantId),
      'Plant',
      crop.plantId
    );

    const existingCrops = await loadPlacedNeighbors(
      this.plantInstanceRepository,
      this.plantRepository,
      { bedId: bed.id, userId: user.id, excludeCropId: crop.id }
    );

    this.cropSpatialService.validatePlacement({
      bed: {
        width: bed.width.value,
        height: bed.height.value
      },
      proposed: {
        position,
        spacingCm: plant.traits.spacingCm.max
      },
      existingCrops,
      excludeCropId: crop.id
    });

    crop.moveTo(new Coordinates(position.x, position.y), user.username, at);

    return bed;
  }
}
