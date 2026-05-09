import type { QueryOptions } from './interfaces/QueryOptions.js';
import type { PaginationParams } from './interfaces/PaginationParams.js';
import { QueryParserUtils } from './QueryParserUtils.js';
import type { Primitive } from '../types/Primitive.js';
import { createError } from '../../errors/index.js';

type ParsedFilterValue = Primitive | Primitive[];

type ParsedFilters = Record<string, Record<string, ParsedFilterValue>>;

export class GenericQueryParser {
  static parse<TFilter>(query: Record<string, unknown>): QueryOptions<TFilter> {
    const { sort, include, pagination, ...rest } = query;

    return {
      filter: this.parseFilters(rest) as TFilter,
      sort: QueryParserUtils.parseSort(sort) ?? {},
      include: QueryParserUtils.parseInclude(include) ?? [],
      pagination: this.normalizePagination(pagination)
    };
  }

  private static parseFilters(filters: Record<string, unknown>): ParsedFilters {
    const result: ParsedFilters = {};

    for (const [key, value] of Object.entries(filters)) {
      if (typeof value !== 'string') continue;

      const match = key.match(/^filter\[(.+?)\](?:\[(.+?)\])?$/);
      if (!match || !match[1]) continue;

      const field = match[1];
      const operator = match[2] ?? 'eq';

      let parsedValue: ParsedFilterValue = value;

      // CSV -> array
      if (value.includes(',')) {
        parsedValue = value.split(',').map((v) => v.trim());
      }

      // boolean parsing
      if (value === 'true') parsedValue = true;
      if (value === 'false') parsedValue = false;

      if (!result[field]) {
        result[field] = {};
      }

      const bucket = result[field];

      switch (operator) {
        // string operators
        case 'contains':
        case 'startsWith':
        case 'endsWith':
          bucket[operator] = String(parsedValue);
          break;

        // array operators
        case 'in':
        case 'includesSome':
          bucket[operator] = Array.isArray(parsedValue)
            ? parsedValue
            : [parsedValue];
          break;

        case 'includes':
          bucket[operator] = String(parsedValue);
          break;

        // numeric operators
        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte':
          bucket[operator] = Number(parsedValue);
          break;

        // default eq
        default:
          if (Array.isArray(parsedValue)) {
            throw createError.badRequest(
              `Invalid eq value for field ${field}: arrays are not allowed. Use 'in' instead.`
            );
          }

          bucket.eq = parsedValue;
          break;
      }
    }

    return result;
  }

  private static normalizePagination(pagination?: unknown): PaginationParams {
    const obj = (pagination ?? {}) as Record<string, unknown>;

    return {
      page: QueryParserUtils.toNumber(obj.page, 1),
      limit: QueryParserUtils.toNumber(obj.limit, 20)
    };
  }
}
