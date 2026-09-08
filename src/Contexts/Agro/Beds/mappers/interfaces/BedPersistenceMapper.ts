import type { Bed } from '../../domain/entities/Bed.js';
import type { MongoBedDocument } from '../../infrastructure/persistence/types/MongoBedDocument.js';

export interface BedPersistenceMapper {
  fromMongoDocument(document: MongoBedDocument): Bed;
  toMongoDocument(bed: Bed): MongoBedDocument;
}
