import type { FilterOperators } from './types/FilterOperators.js';
import { toMongoId } from './MongoId.js';
import { Uuid } from '../../../domain/valueObject/Uuid.js';
import type { Primitive } from '../../../../../shared/domain/types/Primitive.js';

type MongoValue = Record<string, unknown>;

export class MongoQueryTranslator {
  static toMongo<TFilter extends Record<string, unknown>>(
    filter?: TFilter
  ): Record<string, unknown> {
    if (!filter) return {};

    const query: Record<string, unknown> = {};

    const entries = Object.entries(filter) as Array<
      [string, FilterOperators<Primitive>]
    >;

    for (const [field, condition] of entries) {
      if (!this.isObject(condition)) continue;
      if (this.isEmpty(condition)) continue;

      const mongoField = field === 'id' ? '_id' : field;

      let translated = this.translateCondition(condition);
      translated = this.mapUuidValues(translated);

      if (this.hasValue(translated)) {
        query[mongoField] = translated;
      }
    }

    return query;
  }

  private static mapUuidValues(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.mapUuidValues(v));
    }

    if (typeof value === 'string' && Uuid.isValid(value)) {
      return toMongoId(value);
    }

    if (this.isObject(value)) {
      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.mapUuidValues(v);
      }

      return result;
    }

    return value;
  }

  private static translateCondition(
    condition: FilterOperators<Primitive>
  ): unknown {
    if ('eq' in condition && condition.eq !== undefined) {
      return condition.eq;
    }

    const regex = this.buildRegex(condition);
    if (regex) return regex;

    const set = this.buildSetOperators(condition);
    if (set) return set;

    const range = this.buildRangeOperators(condition);
    if (range) return range;

    return undefined;
  }

  private static buildRegex(condition: FilterOperators<Primitive>): unknown {
    if ('contains' in condition && condition.contains !== undefined) {
      return {
        $regex: String(condition.contains),
        $options: 'i'
      };
    }

    if ('startsWith' in condition && condition.startsWith !== undefined) {
      return {
        $regex: `^${String(condition.startsWith)}`,
        $options: 'i'
      };
    }

    if ('endsWith' in condition && condition.endsWith !== undefined) {
      return {
        $regex: `${String(condition.endsWith)}$`,
        $options: 'i'
      };
    }

    return undefined;
  }

  private static buildSetOperators(
    condition: FilterOperators<Primitive>
  ): unknown {
    if ('in' in condition && condition.in !== undefined) {
      return { $in: condition.in };
    }

    if ('has' in condition && condition.has !== undefined) {
      return {
        $elemMatch: { $eq: condition.has }
      };
    }

    if ('hasAny' in condition && condition.hasAny !== undefined) {
      return { $in: condition.hasAny };
    }

    return undefined;
  }

  private static buildRangeOperators(
    condition: FilterOperators<Primitive>
  ): MongoValue | undefined {
    const mongo: MongoValue = {};

    if ('gt' in condition && condition.gt !== undefined) {
      mongo.$gt = condition.gt;
    }

    if ('gte' in condition && condition.gte !== undefined) {
      mongo.$gte = condition.gte;
    }

    if ('lt' in condition && condition.lt !== undefined) {
      mongo.$lt = condition.lt;
    }

    if ('lte' in condition && condition.lte !== undefined) {
      mongo.$lte = condition.lte;
    }

    return Object.keys(mongo).length ? mongo : undefined;
  }

  private static isObject(value: unknown): value is FilterOperators<Primitive> {
    return typeof value === 'object' && value !== null;
  }

  private static isEmpty(condition: FilterOperators<Primitive>): boolean {
    return Object.values(condition).every((v) => v === undefined);
  }

  private static hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  }
}
