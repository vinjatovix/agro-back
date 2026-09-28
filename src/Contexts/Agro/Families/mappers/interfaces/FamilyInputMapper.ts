import type { CreateFamilyDto } from '../../application/useCases/interfaces/CreateFamilyDto.js';
import type { UpdateFamilyInput } from '../../application/useCases/interfaces/UpdateFamilyInput.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyInformationChanges } from '../../domain/types/FamilyInformationChanges.js';

export interface FamilyInputMapper {
  fromCreateDto(dto: CreateFamilyDto, user: string): Family;
  toChanges(input: UpdateFamilyInput): FamilyInformationChanges;
}
