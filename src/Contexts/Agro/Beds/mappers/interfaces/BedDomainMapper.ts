import type { Bed } from '../../domain/entities/Bed.js';
import type { BedPrimitives } from '../../domain/entities/types/BedPrimitives.js';

export interface BedDomainMapper {
  toPrimitives(bed: Bed): BedPrimitives;
  fromPrimitives(primitives: BedPrimitives): Bed;
}
