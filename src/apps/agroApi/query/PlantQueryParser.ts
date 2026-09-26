import type { ListPlantsDto } from '../../../Contexts/Agro/Plants/application/useCases/interfaces/ListPlantsDto.js';
import type { PlantFilter } from '../../../Contexts/Agro/Plants/domain/entities/types/PlantFilter.js';
import { GenericQueryParser } from './GenericQueryParser.js';

export class PlantQueryParser {
  parse(query: Record<string, unknown>): ListPlantsDto {
    const base = GenericQueryParser.parse<PlantFilter>(query);

    return {
      query: base
    };
  }
}
