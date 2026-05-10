import type { QueryOptions } from './interfaces/QueryOptions.js';
import type { PaginationParams } from './interfaces/PaginationParams.js';
import { QueryParserUtils } from './QueryParserUtils.js';
import type { Primitive } from '../types/Primitive.js';
import { createError } from '../../errors/index.js';

type ParsedFilterValue = Primitive | Primitive[];

type ParsedFilters = Record<string, Record<string, ParsedFilterValue>>;

export class GenericQueryParser {
  static parse<TFilter>(query: Record<string, unknown>): QueryOptions<TFilter> {
    const { filter, sort, include, pagination } = query;

    return {
      filter: this.parseFilters(filter) as TFilter,
      sort: QueryParserUtils.parseSort(sort) ?? {},
      include: QueryParserUtils.parseInclude(include) ?? [],
      pagination: this.normalizePagination(pagination)
    };
  }

  private static parseFilters(filters: unknown): ParsedFilters {
    if (!filters || typeof filters !== 'object') {
      return {};
    }

    const result: ParsedFilters = {};

    for (const [field, operators] of Object.entries(filters)) {
      if (!operators || typeof operators !== 'object') {
        continue;
      }

      for (const [operator, rawValue] of Object.entries(
        operators as Record<string, unknown>
      )) {
        if (typeof rawValue !== 'string') {
          throw createError.badRequest(
            `Invalid value for filter '${field}.${operator}': expected string`
          );
        }

        let parsedValue: ParsedFilterValue = rawValue;

        // CSV -> array
        if (rawValue.includes(',')) {
          parsedValue = rawValue.split(',').map((v) => v.trim());
        }

        // boolean parsing
        if (rawValue === 'true') parsedValue = true;
        if (rawValue === 'false') parsedValue = false;

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
          case 'has':
          case 'hasAny':
            bucket[operator] = (
              Array.isArray(parsedValue) ? parsedValue : [parsedValue]
            ).map((v) => QueryParserUtils.coerce(String(v)));
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

          // eq
          case 'eq':
          default:
            if (Array.isArray(parsedValue)) {
              throw createError.badRequest(
                `Invalid eq value for field ${field}: arrays are not allowed. Use 'in' instead.`
              );
            }

            bucket.eq = QueryParserUtils.coerce(String(parsedValue));
            break;
        }
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
