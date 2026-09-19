import type { CreateBedInput } from '../../application/useCases/interfaces/CreateBedInput.js';
import type { UpdateBedInput } from '../../application/useCases/interfaces/UpdateBedInput.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedPatch } from '../../application/useCases/interfaces/BedPatch.js';

export interface BedApiMapper {
  fromCreateInputToDomain(input: CreateBedInput, user: string): Bed;
  fromUpdateInputToPrimitivesPatch(input: UpdateBedInput): BedPatch;
}
