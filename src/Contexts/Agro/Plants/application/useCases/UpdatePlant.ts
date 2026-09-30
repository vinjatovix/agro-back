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

export class UpdatePlant {
  constructor(
    private readonly plantRepository: PlantRepository,
    private readonly familyRepository: FamilyRepository
  ) {}

  async execute(
    input: UpdatePlantInput,
    user: string,
    expectedVersion: number
  ): Promise<Plant> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(input.id),
      'Plant',
      input.id
    );
    ensureVersion(plant.version, expectedVersion, 'Plant', input.id);

    const changes = plantInputMapper.toChanges(input);

    await this.ensureFamilyExists(changes);

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

  private async ensureFamilyExists(changes: PlantChanges): Promise<void> {
    if (changes.identity?.family) {
      const familyExists = await this.familyRepository.exists(
        changes.identity.family
      );

      if (!familyExists) {
        throw new InvalidArgumentException(
          `Family with id ${changes.identity.family} does not exist`
        );
      }
    }
  }
}
