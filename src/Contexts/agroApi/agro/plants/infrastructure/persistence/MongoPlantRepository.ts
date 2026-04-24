import type { Binary, UUID } from 'mongodb';
import { MongoRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { updateMetadata } from '../../../../../shared/application/utils/updateMetadata.js';
import type { PlantLifecycleValue } from '../../domain/entities/types/PlantLifecycleValue.js';
import { diffObjects } from '../../../../../../shared/domain/diff/diffObjects.js';
import { Username } from '../../../../Auth/domain/Username.js';
import type { UnknownRecord } from '../../../../../../shared/domain/types/UnknownRecord.js';
import { plantMapper } from '../../mappers/plantMapper.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { PlantSowingPrimitives } from '../../domain/entities/types/PlantSowingPrimitives.js';
import type { PlantKnowledgePrimitives } from '../../domain/entities/types/PlantKnowledgePrimitives.js';

type PlantDocument = {
  _id: string | Binary | UUID;
  identity: {
    name: {
      primary: string;
      aliases?: string[];
    };
    familyId: string;
    scientificName?: string;
  };

  traits: {
    lifecycle: PlantLifecycleValue;
    size: {
      height: RangePrimitives;
      spread: RangePrimitives;
    };
    spacingCm: RangePrimitives;
  };

  phenology: {
    sowing: PlantSowingPrimitives;
    flowering: {
      months: number[];
      pollination?: {
        type: string;
        agents?: string[];
      };
    };
    harvest: {
      months: number[];
      description?: string;
    };
  };

  knowledge?: PlantKnowledgePrimitives;

  metadata: PlantPrimitives['metadata'];
  status: PlantPrimitives['status'];
  deletedAt?: string | null;
};

export class MongoPlantRepository
  extends MongoRepository
  implements PlantRepository
{
  protected collectionName(): string {
    return 'plants';
  }

  async findById(id: string): Promise<Plant> {
    const collection = await this.collection();

    const document = await collection.findOne<PlantDocument>({
      _id: toMongoId(id)
    });

    if (!document) {
      throw new Error(`Plant not found: ${id}`);
    }

    return this.mapDocumentToPlant(document);
  }

  async save(plant: Plant): Promise<void> {
    await this.persist(plant.id.value, plantMapper.toPrimitives(plant));
  }

  async updateWithDiff(
    current: PlantPrimitives,
    updated: PlantPrimitives,
    username: string
  ): Promise<void> {
    const collection = await this.collection();

    const mongoId = toMongoId(current.id);

    const diff = diffObjects(
      current as unknown as UnknownRecord,
      updated as unknown as UnknownRecord
    );

    const patch = this.normalizePatch(diff);
    const hasSet = Object.keys(patch.set ?? {}).length > 0;
    const hasUnset = Object.keys(patch.unset ?? {}).length > 0;

    if (!hasSet && !hasUnset) {
      return;
    }

    const metadata = updateMetadata(
      new Username(username)
    ) as unknown as UnknownRecord;

    const updateQuery: {
      $set?: UnknownRecord;
      $unset?: Record<string, ''>;
    } = {};

    if (hasSet) {
      updateQuery.$set = {
        ...patch.set,
        ...metadata
      };
    } else {
      updateQuery.$set = metadata;
    }

    if (hasUnset) {
      updateQuery.$unset = patch.unset;
    }

    const result = await collection.updateOne({ _id: mongoId }, updateQuery);

    if (result.matchedCount === 0) {
      throw new Error(`Plant not found: ${current.id}`);
    }
  }

  async findAll(): Promise<Plant[]> {
    const collection = await this.collection();

    const documents = await collection.find<PlantDocument>({}).toArray();

    return documents.map((doc) => this.mapDocumentToPlant(doc));
  }

  async exists(id: string): Promise<boolean> {
    const collection = await this.collection();

    const count = await collection.countDocuments({
      _id: toMongoId(id)
    });

    return count > 0;
  }

  private mapDocumentToPlant(document: PlantDocument): Plant {
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

  private normalizePatch(diff: UnknownRecord): {
    set: UnknownRecord;
    unset: Record<string, ''>;
  } {
    const set: UnknownRecord = {};
    const unset: Record<string, ''> = {};

    for (const [key, value] of Object.entries(diff.set ?? {})) {
      if (value === undefined) continue;

      if (value === null) {
        unset[key] = '';
        continue;
      }

      set[key] = value;
    }

    for (const key of Object.keys(diff.unset ?? {})) {
      unset[key] = '';
    }

    return { set, unset };
  }
}
