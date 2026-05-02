import { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantMapper } from '../../mappers/plantMapper.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { MongoPlantDocument } from './types/MongoPlantDocument.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';

export class MongoPlantRepository
  extends MongoCrudRepository<Plant, PlantPrimitives, MongoPlantDocument>
  implements PlantRepository
{
  protected entityName(): string {
    return 'Plant';
  }
  protected collectionName(): string {
    return `${this.entityName().toLowerCase()}s`;
  }

  protected toDomain(document: MongoPlantDocument): Plant {
    return plantMapper.fromPrimitives({
      id: document._id.toString(),
      identity: document.identity,
      traits: {
        lifecycle: document.traits.lifecycle,
        size: document.traits.size,
        spacingCm: document.traits.spacingCm
      },
      knowledge: document.knowledge,
      phenology: document.phenology,
      metadata: document.metadata,
      status: document.status,
      deletedAt: document.deletedAt
    } as PlantPrimitives);
  }

  protected toPrimitives(plant: Plant): PlantPrimitives {
    return plantMapper.toPrimitives(plant);
  }
}
