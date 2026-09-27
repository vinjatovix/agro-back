import { applyPatch } from '../../../../../shared/domain/patch/applyPatch.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantApiMapper } from '../../mappers/plantApiMapper.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export type UpdatePlantInput = UpdatePlantDto & { id: string };

export class UpdatePlant {
  constructor(
    private readonly plantRepository: PlantRepository,
    private readonly familyRepository: FamilyRepository
  ) {}

  async execute(input: UpdatePlantInput, user: string): Promise<Plant> {
    const plant = await this.findActivePlant(input.id);

    if (input.identity?.family) {
      const familyExists = await this.familyRepository.exists(
        input.identity.family
      );

      if (!familyExists) {
        throw new InvalidArgumentException(
          `Family with id ${input.identity.family} does not exist`
        );
      }
    }

    const current = plantDomainMapper.toPrimitives(plant);
    const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch(input);
    const patched = applyPatch(current, patch);
    plantDomainMapper.fromPrimitives(patched);

    await this.plantRepository.updateWithDiff(current, patched, user);

    return this.findActivePlant(input.id);
  }

  private async findActivePlant(id: string): Promise<Plant> {
    return ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );
  }
}
