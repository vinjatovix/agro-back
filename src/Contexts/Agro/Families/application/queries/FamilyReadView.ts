import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { FamilyExtraPrimitives } from '../../domain/types/FamilyExtraPrimitives.js';

/**
 * A family as the catalog read path returns it: plain stored data shaped like
 * the public `Family` response. Never a `Family` aggregate.
 */
export type FamilyReadView = {
  readonly id: string;
  readonly version: number;
  readonly slug: string;
  readonly name: string;
  readonly scientificName: string;
  readonly shortDescription: string;
  readonly aliases: string[];
  readonly highlights: string[];
  /** Omitted when the family has no extra details. */
  readonly extra?: FamilyExtraPrimitives;
  readonly metadata: MetadataPrimitives;
};
