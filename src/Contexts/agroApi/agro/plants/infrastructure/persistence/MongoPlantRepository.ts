import type { Binary, UUID } from 'mongodb';
import { MongoRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/PlantRepository.js';
import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { updateMetadata } from '../../../../../shared/application/utils/updateMetadata.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantLifecycleValue } from '../../domain/entities/types/PlantLifecycleValue.js';
import { diffObjects } from '../../../../../../shared/domain/diff/diffObjects.js';
import { Username } from '../../../../Auth/domain/Username.js';
import type { UnknownRecord } from '../../../../../../shared/domain/types/UnknownRecord.js';

type PlantDocument = {
  _id: string | Binary | UUID;
  name: string;
  familyId: string;
  lifecycle: PlantLifecycleValue;
  size: PlantPrimitives['size'];
  sowing: PlantPrimitives['sowing'];
  floweringMonths: number[];
  harvestMonths: number[];
  spacingCm: PlantPrimitives['spacingCm'];
  metadata: PlantPrimitives['metadata'];
  scientificName?: string;
  status: PlantPrimitives['status'];
  deletedAt?: string | null;
};

export class MongoPlantRepository
  extends MongoRepository<Plant>
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
    return this.persist(plant.id.value, plant);
  }

  async updateWithDiff(
    current: Plant,
    updated: UnknownRecord,
    username: string
  ): Promise<void> {
    const collection = await this.collection();

    const mongoId = toMongoId(current.id.value);

    const currentPrimitives =
      current.toPrimitives() as unknown as UnknownRecord;

    const diff = diffObjects(currentPrimitives, updated);

    const patch = this.normalizePatch(diff);

    const metadata = updateMetadata(new Username(username));

    const updateQuery: {
      $set?: UnknownRecord;
      $unset?: Record<string, ''>;
    } = {};

    if (Object.keys(patch.set).length > 0) {
      updateQuery.$set = {
        ...patch.set,
        ...metadata
      };
    }

    if (Object.keys(patch.unset).length > 0) {
      updateQuery.$unset = patch.unset;
    }

    await this.handleMongoError(() =>
      collection.updateOne({ _id: mongoId }, updateQuery)
    );
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
    return Plant.fromPrimitives({
      id: document._id.toString(),
      name: document.name,
      familyId: document.familyId,
      lifecycle: document.lifecycle,
      size: document.size,
      sowing: document.sowing,
      floweringMonths: document.floweringMonths,
      harvestMonths: document.harvestMonths,
      spacingCm: document.spacingCm,
      metadata: document.metadata,
      status: document.status,
      deletedAt: document.deletedAt ?? null,
      ...(document.scientificName !== undefined && {
        scientificName: document.scientificName
      })
    });
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
