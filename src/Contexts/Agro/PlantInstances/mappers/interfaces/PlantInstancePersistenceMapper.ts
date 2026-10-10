import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type { MongoPlantInstanceDocument } from '../../infrastructure/persistence/types/MongoPlantInstanceDocument.js';

export interface PlantInstancePersistenceMapper {
  fromMongoDocument(document: MongoPlantInstanceDocument): PlantInstance;
  toMongoDocument(instance: PlantInstance): MongoPlantInstanceDocument;
}
