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

        result[field] ??= {};
        const bucket = result[field];

        this.applyOperatorFilter(bucket, field, operator, rawValue);
      }
    }

    return result;
  }

  private static applyOperatorFilter(
    bucket: Record<string, ParsedFilterValue>,
    field: string,
    operator: string,
    rawValue: string
  ): void {
    const parsedValue = this.parseFilterValue(rawValue);

    if (this.isStringOperator(operator)) {
      bucket[operator] = String(parsedValue);
    } else if (this.isArrayOperator(operator)) {
      bucket[operator] = (
        Array.isArray(parsedValue) ? parsedValue : [parsedValue]
      ).map((v) => QueryParserUtils.coerce(String(v)));
    } else if (this.isNumericOperator(operator)) {
      bucket[operator] = Number(parsedValue);
    } else {
      this.applyEqOperator(bucket, field, parsedValue);
    }
  }

  private static parseFilterValue(rawValue: string): ParsedFilterValue {
    let parsedValue: ParsedFilterValue = rawValue;

    if (rawValue.includes(',')) {
      parsedValue = rawValue.split(',').map((v) => v.trim());
    }

    if (rawValue === 'true') parsedValue = true;
    if (rawValue === 'false') parsedValue = false;

    return parsedValue;
  }

  private static isStringOperator(operator: string): boolean {
    return ['contains', 'startsWith', 'endsWith', 'includes'].includes(
      operator
    );
  }

  private static isArrayOperator(operator: string): boolean {
    return ['has', 'hasAny'].includes(operator);
  }

  private static isNumericOperator(operator: string): boolean {
    return ['gt', 'gte', 'lt', 'lte'].includes(operator);
  }

  private static applyEqOperator(
    bucket: Record<string, ParsedFilterValue>,
    field: string,
    parsedValue: ParsedFilterValue
  ): void {
    if (Array.isArray(parsedValue)) {
      throw createError.badRequest(
        `Invalid eq value for field ${field}: arrays are not allowed. Use 'in' instead.`
      );
    }

    bucket.eq = QueryParserUtils.coerce(String(parsedValue));
  }

  private static normalizePagination(pagination?: unknown): PaginationParams {
    const obj = (pagination ?? {}) as Record<string, unknown>;

    return {
      page: QueryParserUtils.toNumber(obj.page, 1),
      limit: QueryParserUtils.toNumber(obj.limit, 20)
    };
  }
}
