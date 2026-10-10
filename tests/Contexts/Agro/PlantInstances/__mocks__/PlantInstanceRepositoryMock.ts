import type { PlantInstance } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import type { PlantInstancePrimitives } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantInstancePrimitives.js';
import { PlantInstanceLifecycleStatus } from '../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/PlantLifecycleStatus.js';
import type {
  ListPlantInstancesParams,
  PlantInstanceRef,
  PlantInstanceRepository
} from '../../../../../src/Contexts/Agro/PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import { plantInstanceDomainMapper } from '../../../../../src/Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { WriteOutcome } from '../../../../../src/Contexts/shared/domain/repositories/WriteOutcome.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

export class PlantInstanceRepositoryMock implements PlantInstanceRepository {
  private readonly storage = new Map<string, PlantInstance>();
  public saveCalls: PlantInstance[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(instance: PlantInstance): Promise<void> {
    this.saveCalls.push(instance);
    this.storage.set(instance.id, instance);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateWithDiff(
    _current: PlantInstancePrimitives,
    updated: PlantInstancePrimitives
  ): Promise<WriteOutcome> {
    this.storage.set(
      updated.id,
      plantInstanceDomainMapper.fromPrimitives(updated)
    );
    return 'written';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<PlantInstance>> {
    const instance = this.storage.get(id);
    if (
      !instance ||
      instance.userId !== userId ||
      instance.instanceStatus !== PlantInstanceLifecycleStatus.ACTIVE
    ) {
      return null;
    }
    return instance;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listOwnedActive(
    params: ListPlantInstancesParams
  ): Promise<PaginatedResult<PlantInstance>> {
    let list = Array.from(this.storage.values()).filter(
      (c) =>
        c.userId === params.userId &&
        c.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE
    );
    if (params.bedId) {
      list = list.filter((c) => c.bedId === params.bedId);
    }
    if (params.plantId) {
      list = list.filter((c) => c.plantId === params.plantId);
    }
    return {
      data: list,
      pagination: {
        page: params.pagination.page ?? 1,
        limit: params.pagination.limit ?? 25,
        totalPages: 1,
        totalItems: list.length
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findActiveByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstance[]> {
    return Array.from(this.storage.values()).filter(
      (c) =>
        c.userId === userId &&
        bedIds.includes(c.bedId) &&
        c.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE
    );
  }

  async findActiveRefsByBedIds(
    bedIds: string[],
    userId: string
  ): Promise<PlantInstanceRef[]> {
    const crops = await this.findActiveByBedIds(bedIds, userId);
    return crops.map((crop) => ({ id: crop.id, bedId: crop.bedId }));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findActiveByBedId(
    bedId: string,
    userId: string
  ): Promise<PlantInstance[]> {
    return Array.from(this.storage.values()).filter(
      (c) =>
        c.userId === userId &&
        c.bedId === bedId &&
        c.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async markAllInBedAsRemoved(
    bedId: string,
    userId: string,
    removedAt: Date,
    updatedBy: string
  ): Promise<number> {
    let count = 0;
    for (const [id, instance] of this.storage.entries()) {
      if (
        instance.bedId === bedId &&
        instance.userId === userId &&
        instance.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE
      ) {
        instance.markAsRemoved(updatedBy, removedAt);
        this.storage.set(id, instance);
        count++;
      }
    }
    return count;
  }

  addToStorage(instance: PlantInstance): void {
    this.storage.set(instance.id, instance);
  }

  getStored(id: string): PlantInstance | undefined {
    return this.storage.get(id);
  }
}
