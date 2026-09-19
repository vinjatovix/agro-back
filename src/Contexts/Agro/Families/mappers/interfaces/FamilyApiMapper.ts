import type { CreateFamilyDto } from '../../application/useCases/interfaces/CreateFamilyDto.js';
import type { FamilyPatch } from '../../application/useCases/interfaces/FamilyPatch.js';
import type { UpdateFamilyInput } from '../../application/useCases/interfaces/UpdateFamilyInput.js';
import type { Family } from '../../domain/entities/Family.js';

export interface FamilyApiMapper {
  fromCreateDto(dto: CreateFamilyDto, user: string): Family;
  fromUpdateInputToPrimitivesPatch(input: UpdateFamilyInput): FamilyPatch;
}
