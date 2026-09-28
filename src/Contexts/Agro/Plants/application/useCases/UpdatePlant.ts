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
    const plant = await this.findActivePlant(input.id);
    ensureVersion(plant.version, expectedVersion, 'Plant', input.id);

    const changes = plantInputMapper.toChanges(input);

    if (!this.hasAnyChanges(changes)) {
      return plant;
    }

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

    const before = plantDomainMapper.toPrimitives(plant);

    if (changes.identity) plant.updateIdentity(changes.identity);
    if (changes.traits) plant.updateTraits(changes.traits);
    if (changes.phenology) plant.updatePhenology(changes.phenology);
    if (changes.knowledge) plant.updateKnowledge(changes.knowledge);

    const after = plantDomainMapper.toPrimitives(plant);

    await this.plantRepository.updateWithDiff(before, after, user);

    return this.findActivePlant(input.id);
  }

  private hasAnyChanges(changes: PlantChanges): boolean {
    return !!(
      changes.identity ||
      changes.traits ||
      changes.phenology ||
      changes.knowledge
    );
  }

  private async findActivePlant(id: string): Promise<Plant> {
    return ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );
  }
}
