import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { IdentityPrimitives } from '../../domain/entities/types/IdentityPrimitives.js';
import type { PlantKnowledgePrimitives } from '../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';
import type { PlantStatus } from '../../domain/entities/types/PlantStatus.js';

/**
 * A plant as the catalog read path returns it: plain stored data shaped like
 * the public `Plant` response. Never a `Plant` aggregate, so no business rule
 * is checked when it is built.
 */
export type PlantReadView = {
  readonly id: string;
  readonly version: number;
  /** `family` is always the plain family id in this iteration. */
  readonly identity: IdentityPrimitives;
  readonly traits: PlantPrimitives['traits'];
  readonly phenology: PlantPrimitives['phenology'];
  readonly knowledge: PlantKnowledgePrimitives;
  readonly metadata: MetadataPrimitives;
  /** `ACTIVE` or `DELETED`. */
  readonly status: `${PlantStatus}`;
  readonly deletedAt: string | null;
};
