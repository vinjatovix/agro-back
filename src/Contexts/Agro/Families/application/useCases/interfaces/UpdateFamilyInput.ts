import type { UpdateFamilyDto } from './UpdateFamilyDto.js';

export type UpdateFamilyInput = UpdateFamilyDto & {
  /** The family's id (UUID) or its current slug. */
  idOrSlug: string;
};
