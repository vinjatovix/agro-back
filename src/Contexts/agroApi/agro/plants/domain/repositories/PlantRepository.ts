import type { UnknownRecord } from '../../../../../../shared/domain/types/UnknownRecord.js';
import type { Plant } from '../entities/Plant.js';

export interface PlantRepository {
  findById(id: string): Promise<Plant>;
  save(plant: Plant): Promise<void>;
  updateWithDiff(
    current: Plant,
    updated: UnknownRecord,
    user: string
  ): Promise<void>;
  findAll(): Promise<Plant[]>;
  exists(id: string): Promise<boolean>;
}
