import type { DeepPartial } from '../../../../../../shared/domain/patch/DeepPartial.js';
import type { CreateFamilyDto } from '../../application/useCases/interfaces/CreateFamilyDto.js';
import type { UpdateFamilyDto } from '../../application/useCases/interfaces/UpdateFamilyDto.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyPrimitives } from '../../domain/types/FamilyPrimitives.js';

export interface FamilyApiMapper {
  fromCreateDto(dto: CreateFamilyDto, user: string): Family;
  fromUpdateDtoToPrimitivesPatch(
    dto: UpdateFamilyDto
  ): DeepPartial<FamilyPrimitives>;
}
