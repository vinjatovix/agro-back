import type { Bed } from '../../entities/Bed.js';
import type { BedPrimitives } from '../../entities/types/BedPrimitives.js';

export interface BedRepository {
  findById(id: string): Promise<Bed>;
  save(bed: Bed): Promise<void>;
  updateWithDiff(
    current: BedPrimitives,
    updated: BedPrimitives,
    user: string
  ): Promise<void>;
  findAll(): Promise<Bed[]>;
  exists(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Bed[]>;
}
