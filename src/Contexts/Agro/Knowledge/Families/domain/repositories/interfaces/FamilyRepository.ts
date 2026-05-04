import type { Family } from '../../entities/Family.js';
import type { FamilyPrimitives } from '../../types/FamilyPrimitives.js';

export interface FamilyRepository {
  findById(id: string): Promise<Family>;
  findBySlug(slug: string): Promise<Family>;
  save(family: Family): Promise<void>;
  updateWithDiff(
    current: FamilyPrimitives,
    updated: FamilyPrimitives,
    user: string
  ): Promise<void>;
  findAll(): Promise<Family[]>;
  exists(id: string): Promise<boolean>;
}
