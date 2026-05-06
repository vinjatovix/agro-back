import type { DeepPartial } from '../../../../../../shared/domain/patch/DeepPartial.js';
import type { BedPrimitives } from '../../../domain/entities/types/BedPrimitives.js';

export type BedPatch = DeepPartial<BedPrimitives> & {
  id: string;
};
