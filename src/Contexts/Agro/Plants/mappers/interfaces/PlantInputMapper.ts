import type { CreatePlantDto } from '../../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../../application/useCases/interfaces/UpdatePlantDto.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantChanges } from '../../domain/entities/types/PlantChanges.js';

export interface PlantInputMapper {
  fromCreateDto(dto: CreatePlantDto, user: string): Plant;
  toChanges(dto: UpdatePlantDto): PlantChanges;
}
