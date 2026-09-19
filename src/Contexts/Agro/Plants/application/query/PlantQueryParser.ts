import { GenericQueryParser } from '../../../../../shared/domain/query/GenericQueryParser.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import type { ListPlantsDto } from '../useCases/interfaces/ListPlantsDto.js';

export class PlantQueryParser {
  parse(query: Record<string, unknown>): ListPlantsDto {
    const base = GenericQueryParser.parse<PlantFilter>(query);

    return {
      query: base
    };
  }
}
