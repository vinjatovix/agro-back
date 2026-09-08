import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantKnowledgePrimitives } from '../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantKnowledge } from '../../domain/value-objects/PlantKnowledge.js';
import type { MongoPlantDocument } from '../../infrastructure/persistence/types/MongoPlantDocument.js';

export interface PlantPersistenceMapper {
  fromMongoDocument(document: MongoPlantDocument): Plant;
  mapKnowledge(knowledge?: PlantKnowledgePrimitives | null): PlantKnowledge;
  toMongoDocument(plant: Plant): MongoPlantDocument;
}
