/* eslint-disable @typescript-eslint/require-await */
import { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantMapper.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class PlantRepositoryMock
  extends BaseMongoCrudRepositoryMock<Plant, PlantPrimitives>
  implements PlantRepository
{
  protected toDomain(primitives: PlantPrimitives): Plant {
    return plantMapper.fromPrimitives(primitives);
  }

  protected entityName(): string {
    return 'Plant';
  }
}
