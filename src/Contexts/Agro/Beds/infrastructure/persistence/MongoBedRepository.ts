import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedPrimitives } from '../../domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedMapper } from '../../mappers/bedMapper.js';
import type { MongoBedDocument } from './types/MongoBedDocument.js';

export class MongoBedRepository
  extends MongoCrudRepository<Bed, BedPrimitives, MongoBedDocument>
  implements BedRepository
{
  protected entityName(): string {
    return 'Bed';
  }
  protected collectionName(): string {
    return `${this.entityName().toLowerCase()}s`;
  }

  protected toDomain(document: MongoBedDocument): Bed {
    return bedMapper.fromPrimitives({
      id: document._id.toString(),
      userId: document.userId.toString(),
      name: document.name,
      width: document.width,
      height: document.height,
      depth: document.depth,
      plantInstances: document.plantInstances,
      metadata: document.metadata,
      deleted: document.deleted,
      ...(document.deletedAt && { deletedAt: new Date(document.deletedAt) })
    });
  }

  protected toPrimitives(entity: Bed): BedPrimitives {
    return bedMapper.toPrimitives(entity);
  }

  async findByUserId(userId: string): Promise<Bed[]> {
    const collection = await this.collection();

    const documents = await collection.find({ userId }).toArray();

    return documents.map((doc) => this.toDomain(doc as MongoBedDocument));
  }
}
