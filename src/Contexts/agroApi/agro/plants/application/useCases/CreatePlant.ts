import { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import { Plant, type PlantProps } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import { PlantLifecycle } from '../../domain/value-objects/PlantLifecycicle.js';
import { PlantSowing } from '../../domain/value-objects/PlantSowing.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';

export class CreatePlant {
  constructor(private readonly plantRepository: PlantRepository) {}

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw new Error(`Plant already exists: ${dto.id}`);
    }

    const now = new Date();

    if (!dto.sowing.methods?.direct) {
      throw new Error('PlantSowing.direct is required');
    }

    const plantProps: PlantProps = {
      id: dto.id,
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

      metadata: new Metadata({
        createdAt: now,
        createdBy: user,
        updatedAt: now,
        updatedBy: user
      })
    };

    if (dto.scientificName) {
      plantProps.scientificName = dto.scientificName;
    }

    const plant = new Plant(plantProps);

    await this.plantRepository.save(plant);

    return plant;
  }
}
