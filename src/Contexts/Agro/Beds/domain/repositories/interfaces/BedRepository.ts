import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Bed } from '../../entities/Bed.js';
import type { BedFilter } from '../../entities/types/BedFilter.js';
import type { BedPrimitives } from '../../entities/types/BedPrimitives.js';

export interface BedRepository {
  findById(id: string): Promise<Bed>;
  save(bed: Bed): Promise<void>;
  updateWithDiff(
    current: BedPrimitives,
    updated: BedPrimitives,
    user: string
  ): Promise<void>;
  findAll(options?: QueryOptions<BedFilter>): Promise<PaginatedResult<Bed>>;
  exists(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Bed[]>;
}
