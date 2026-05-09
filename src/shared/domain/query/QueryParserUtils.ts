import type { SortOptions } from './interfaces/SortOptions.js';

export class QueryParserUtils {
  static parseCsv(value: unknown): string[] {
    if (typeof value !== 'string') return [];

    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  static toNumber(value: unknown, fallback: number): number {
    if (value === null || value === undefined) {
      return fallback;
    }

    const n = typeof value === 'number' ? value : Number(value);

    return Number.isFinite(n) ? n : fallback;
  }

  static parseSort(value: unknown): SortOptions | undefined {
    if (!value) return undefined;

    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return this.isValidSort(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }

    if (this.isValidSort(value)) {
      return value;
    }

    return undefined;
  }

  static parseInclude(value: unknown): string[] | undefined {
    if (!value) return undefined;

    if (typeof value === 'string') {
      return this.parseCsv(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }

    return undefined;
  }

  private static isValidSort(value: unknown): value is SortOptions {
    if (!value || typeof value !== 'object') return false;

    const entries = Object.entries(value as Record<string, unknown>);

    return entries.every(([_, v]) => v === 'asc' || v === 'desc');
  }
}
