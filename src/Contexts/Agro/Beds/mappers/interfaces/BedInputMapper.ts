import type { CreateBedInput } from '../../application/useCases/interfaces/CreateBedInput.js';
import type { UpdateBedInput } from '../../application/useCases/interfaces/UpdateBedInput.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedChanges } from '../../domain/entities/types/BedChanges.js';

export interface BedInputMapper {
  fromCreateInputToDomain(input: CreateBedInput, user: string): Bed;
  toChanges(input: UpdateBedInput): BedChanges;
}
