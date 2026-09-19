import { GenericQueryParser } from '../../../../../shared/domain/query/GenericQueryParser.js';

import type { FamilyFilter } from '../../domain/types/FamilyFilter.js';
import type { ListFamiliesDto } from '../useCases/interfaces/ListFamiliesDto.js';

export class FamilyQueryParser {
  parse(query: Record<string, unknown>): ListFamiliesDto {
    const base = GenericQueryParser.parse<FamilyFilter>(query);

    return {
      query: base
    };
  }
}
