import type { DeepPartial } from '../../../../../shared/domain/patch/DeepPartial.js';
import type { CreatePlantDto } from '../../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../../application/useCases/interfaces/UpdatePlantDto.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantPrimitives } from '../../domain/entities/types/PlantPrimitives.js';

export interface PlantApiMapper {
  fromCreateDto(dto: CreatePlantDto, user: string): Plant;
  fromUpdateDtoToPrimitivesPatch(
    dto: UpdatePlantDto
  ): DeepPartial<PlantPrimitives>;
}
