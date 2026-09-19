import type { DeepPartial } from '../../../../../../shared/domain/patch/interfaces/DeepPartial.js';
import type { FamilyPrimitives } from '../../../domain/types/FamilyPrimitives.js';

export type FamilyPatch = DeepPartial<FamilyPrimitives> & { id: string };
