import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type {
  IdentityPrimitives,
  PlantImagePrimitives,
  PlantKnowledgePrimitives,
  PlantPrimitives,
  PlantStatus
} from '../../domain/entities/types/index.js';
import type { FamilySummaryView } from './FamilySummaryReader.js';

/** The plain family id, or its summary when the family is included. */
export type PlantFamilyView = string | FamilySummaryView;

/** The plant's primary picture: `url`, plus `title`/`source` when stored. */
export type PlantImageView = Readonly<PlantImagePrimitives>;

/**
 * A plant as the catalog read path returns it: plain stored data shaped like
 * the public `Plant` response. Never a `Plant` aggregate, so no business rule
 * is checked when it is built.
 */
export type PlantReadView = {
  readonly id: string;
  readonly version: number;
  /** `family` is the plain id unless the family is included. */
  readonly identity: Omit<IdentityPrimitives, 'family'> & {
    readonly family: PlantFamilyView;
  };
  readonly traits: PlantPrimitives['traits'];
  readonly phenology: PlantPrimitives['phenology'];
  readonly knowledge: PlantKnowledgePrimitives;
  /**
   * First `knowledge.resources` image; never stored. Every plant has one, so
   * `null` only comes from stored data that breaks that rule, which the
   * response check rejects.
   */
  readonly image: PlantImageView | null;
  readonly metadata: MetadataPrimitives;
  /** `ACTIVE` or `DELETED`. */
  readonly status: `${PlantStatus}`;
  readonly deletedAt: string | null;
};

/** Fields of a plant that `fields[plants]` can select; declared order is canonical. */
export const PLANT_FIELDS = [
  'id',
  'identity',
  'traits',
  'phenology',
  'knowledge',
  'image',
  'metadata',
  'status',
  'deletedAt',
  'version'
] as const satisfies readonly (keyof PlantReadView)[];

export type PlantField = (typeof PLANT_FIELDS)[number];

/** Relations of a plant that `include` can embed. */
export const PLANT_RELATIONS = ['family'] as const;

export type PlantRelation = (typeof PLANT_RELATIONS)[number];

/** What a read with a fieldset returns: `id` plus any subset of the fields. */
export type PlantSparseView = Pick<PlantReadView, 'id'> &
  Partial<Omit<PlantReadView, 'id'>>;
