import type { Family } from '../../domain/entities/Family.js';
import type { FamilyPrimitives } from '../../domain/types/FamilyPrimitives.js';

export interface FamilyDomainMapper {
  toPrimitives(family: Family): FamilyPrimitives;
  fromPrimitives(primitives: FamilyPrimitives): Family;
}
