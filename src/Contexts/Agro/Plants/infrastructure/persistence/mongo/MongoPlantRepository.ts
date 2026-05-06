import { Plant } from '../../../domain/entities/Plant.js';
import type { PlantRepository } from '../../../domain/repositories/interfaces/PlantRepository.js';
import type { PlantPrimitives } from '../../../domain/entities/types/PlantPrimitives.js';
import type { MongoPlantDocument } from '../types/MongoPlantDocument.js';
import { MongoCrudRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { PlantFilter } from '../../../domain/entities/types/PlantFilter.js';
import type { Db } from 'mongodb';
import type { PlantPersistenceMapper } from '../../../mappers/interfaces/PlantPersistenceMapper.js';

export class MongoPlantRepository
  extends MongoCrudRepository<
    Plant,
    PlantPrimitives,
    MongoPlantDocument,
    PlantFilter
  >
  implements PlantRepository
{
  constructor(
    db: Db,
    private readonly plantPersistenceMapper: PlantPersistenceMapper
  ) {
    super(db);
  }
  protected entityName(): string {
    return 'Plant';
  }
  protected collectionName(): string {
    return `${this.entityName().toLowerCase()}s`;
  }

  protected toDomain(document: MongoPlantDocument): Plant {
    return this.plantPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(plant: Plant): MongoPlantDocument {
    return this.plantPersistenceMapper.toMongoDocument(plant);
  }
}
