import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantChanges } from '../../domain/entities/types/PlantChanges.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';
import { plantInputMapper } from '../../mappers/plantInputMapper.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export type UpdatePlantInput = UpdatePlantDto & { id: string };

export type UpdatePlantDependencies = {
  plantRepository: PlantRepository;
  familyRepository: FamilyRepository;
};

export class UpdatePlant {
  private readonly plantRepository: PlantRepository;
  private readonly familyRepository: FamilyRepository;

  constructor({ plantRepository, familyRepository }: UpdatePlantDependencies) {
    this.plantRepository = plantRepository;
    this.familyRepository = familyRepository;
  }

  async execute(
    input: UpdatePlantInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Plant> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(input.id),
      'Plant',
      input.id
    );
    ensureVersion(plant.version, expectedVersions, 'Plant', input.id);

    const changes = plantInputMapper.toChanges(input);

    await this.ensureFamilyExists(plant, changes);

    const before = plantDomainMapper.toPrimitives(plant);
    // One timestamp for the whole request, whatever sections it touches.
    const at = new Date();

    if (changes.identity) plant.updateIdentity(changes.identity, user, at);
    if (changes.traits) plant.updateTraits(changes.traits, user, at);
    if (changes.phenology) plant.updatePhenology(changes.phenology, user, at);
    if (changes.knowledge) plant.updateKnowledge(changes.knowledge, user, at);

    const after = plantDomainMapper.toPrimitives(plant);

    // Always called: an empty diff is still confirmed against storage.
    plant.syncVersion(await this.plantRepository.updateWithDiff(before, after));

    return plant;
  }

  /**
   * A new family the changes point to must exist. `PlantIdentity` trims and
   * validates it first, without touching the plant, so a blank or malformed
   * id is rejected before the lookup. The current family is not looked up
   * again.
   */
  private async ensureFamilyExists(
    plant: Plant,
    changes: PlantChanges
  ): Promise<void> {
    if (changes.identity?.family === undefined) return;

    const { family } = plant.identity.update(changes.identity);
    if (family === plant.identity.family) return;

    if (!(await this.familyRepository.exists(family))) {
      throw new InvalidArgumentException(
        `Family with id ${family} does not exist`
      );
    }
  }
}
