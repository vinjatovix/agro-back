import {
  MonthSet,
  Range
} from '../../../../../../shared/domain/value-objects/index.js';
import {
  Metadata,
  Uuid
} from '../../../../../shared/domain/valueObject/index.js';
import { Plant } from '../../domain/entities/Plant.js';
import { type PlantProps } from '../../domain/entities/types/PlantProps.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import {
  PlantLifecycle,
  PlantSowing
} from '../../domain/value-objects/index.js';
import type { CreatePlantDto } from './interfaces/index.js';

export class CreatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw new Error(`Plant already exists: ${dto.id}`);
    }

    if (!dto.sowing.methods?.direct) {
      throw new Error('PlantSowing.direct is required');
    }

    const plantProps: PlantProps = {
      id: new Uuid(dto.id),
      name: dto.name,
      familyId: dto.familyId,
      lifecycle: PlantLifecycle.from(dto.lifecycle),
      size: {
        height: new Range(dto.size.height.min, dto.size.height.max),
        spread: new Range(dto.size.spread.min, dto.size.spread.max)
      },
      sowing: new PlantSowing({
        seedsPerHole: new Range(
          dto.sowing.seedsPerHole.min,
          dto.sowing.seedsPerHole.max
        ),
        germinationDays: new Range(
          dto.sowing.germinationDays.min,
          dto.sowing.germinationDays.max
        ),
        months: new MonthSet(dto.sowing.months),
        methods: {
          direct: {
            depth: new Range(
              dto.sowing.methods.direct.depthCm.min,
              dto.sowing.methods.direct.depthCm.max
            )
          },
          ...(dto.sowing.methods.starter && {
            starter: {
              depth: new Range(
                dto.sowing.methods.starter.depthCm.min,
                dto.sowing.methods.starter.depthCm.max
              )
            }
          })
        }
      }),
      floweringMonths: new MonthSet(dto.floweringMonths),
      harvestMonths: new MonthSet(dto.harvestMonths),
      spacingCm: new Range(dto.spacingCm.min, dto.spacingCm.max),
      metadata: Metadata.create(user)
    };

    if (dto.scientificName) {
      plantProps.scientificName = dto.scientificName;
    }

    const plant = new Plant(plantProps);

    await this.plantRepository.save(plant);

    return plant;
  }
}
