import type { FilterOperators } from './types/FilterOperators.js';

type MongoValue = Record<string, unknown>;

export class MongoQueryTranslator {
  static toMongo(filter?: Record<string, unknown>): Record<string, unknown> {
    if (!filter) return {};

    const query: Record<string, unknown> = {};

    for (const field in filter) {
      const condition = filter[field];

      if (!condition) continue;
      if (this.isEmpty(condition)) continue;

      const translated = this.translateCondition(condition);

      if (translated !== undefined && this.hasValue(translated)) {
        query[field] = translated;
      }
    }

    return query;
  }

  private static translateCondition<T>(condition: FilterOperators<T>): unknown {
    if ('eq' in condition && condition.eq !== undefined) {
      return condition.eq;
    }

    const regex = this.buildRegex(condition);
    if (regex) return regex;

    const setOp = this.buildSetOperators(condition);
    if (setOp) return setOp;

    const range = this.buildRangeOperators(condition);
    if (range) return range;

    return undefined;
  }

  private static buildRegex<T>(condition: FilterOperators<T>): unknown {
    if ('contains' in condition && condition.contains !== undefined) {
      return { $regex: condition.contains, $options: 'i' };
    }

    if ('startsWith' in condition && condition.startsWith !== undefined) {
      return { $regex: `^${condition.startsWith}`, $options: 'i' };
    }

    if ('endsWith' in condition && condition.endsWith !== undefined) {
      return { $regex: `${condition.endsWith}$`, $options: 'i' };
    }

    return undefined;
  }

  private static buildSetOperators<T>(condition: FilterOperators<T>): unknown {
    if ('in' in condition && condition.in !== undefined) {
      return { $in: condition.in };
    }

    if ('includes' in condition && condition.includes !== undefined) {
      return { $elemMatch: { $eq: condition.includes } };
    }

    if ('includesSome' in condition && condition.includesSome !== undefined) {
      return { $in: condition.includesSome };
    }

    return undefined;
  }

  private static buildRangeOperators<T>(
    condition: FilterOperators<T>
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

  private static isEmpty(condition: unknown): boolean {
    if (!condition || typeof condition !== 'object') return true;

    return Object.values(condition as Record<string, unknown>).every(
      (v) => v === undefined
    );
  }

  private static hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }
}
