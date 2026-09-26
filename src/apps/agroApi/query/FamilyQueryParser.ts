import type { ListFamiliesDto } from '../../../Contexts/Agro/Families/application/useCases/interfaces/ListFamiliesDto.js';
import type { FamilyFilter } from '../../../Contexts/Agro/Families/domain/types/FamilyFilter.js';
import { GenericQueryParser } from './GenericQueryParser.js';

export class FamilyQueryParser {
  parse(query: Record<string, unknown>): ListFamiliesDto {
    const base = GenericQueryParser.parse<FamilyFilter>(query);

    return {
      query: base
    };
  }
}
