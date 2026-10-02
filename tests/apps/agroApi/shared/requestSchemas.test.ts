import { z } from 'zod';

import {
  boundedRecordSchema,
  httpUrlSchema,
  listSchema,
  partialRangeSchema,
  rangeSchema,
  REQUEST_LIMITS,
  requiredLongTextSchema,
  requiredShortTextSchema,
  trimmedLongTextSchema
} from '../../../../src/apps/agroApi/shared/requestSchemas.js';

describe('shared requestSchemas', () => {
  describe('rangeSchema', () => {
    it('should accept both numeric bounds', () => {
      expect(rangeSchema.safeParse({ min: 1, max: 2 }).success).toBe(true);
    });

    it.each([[{ min: 1 }], [{ max: 2 }], [{ min: '1', max: 2 }]])(
      'should reject the incomplete or non-numeric range %j',
      (value) => {
        expect(rangeSchema.safeParse(value).success).toBe(false);
      }
    );
  });

  describe('partialRangeSchema', () => {
    it.each([[{}], [{ min: 10 }], [{ max: 20 }], [{ min: 10, max: 20 }]])(
      'should accept the partial range %j',
      (value) => {
        expect(partialRangeSchema.safeParse(value).success).toBe(true);
      }
    );

    it('should reject a non-numeric bound', () => {
      expect(partialRangeSchema.safeParse({ min: 'low' }).success).toBe(false);
    });
  });

  describe('requiredShortTextSchema', () => {
    it('should trim the text', () => {
      expect(requiredShortTextSchema.parse('  Tomato  ')).toBe('Tomato');
    });

    it('should check the length after trimming', () => {
      const text = 'x'.repeat(REQUEST_LIMITS.shortText);

      expect(requiredShortTextSchema.parse(`  ${text}  `)).toBe(text);
    });

    it.each([[''], ['   '], ['x'.repeat(REQUEST_LIMITS.shortText + 1)]])(
      'should reject %j',
      (value) => {
        expect(requiredShortTextSchema.safeParse(value).success).toBe(false);
      }
    );
  });

  describe('trimmedLongTextSchema', () => {
    it('should trim the text', () => {
      expect(trimmedLongTextSchema.parse('  Five petals  ')).toBe(
        'Five petals'
      );
    });

    it('should accept an empty text', () => {
      expect(trimmedLongTextSchema.parse('')).toBe('');
    });

    it('should check the length after trimming', () => {
      const text = 'x'.repeat(REQUEST_LIMITS.longText);

      expect(trimmedLongTextSchema.parse(`  ${text}  `)).toBe(text);
    });

    it.each([['x'.repeat(REQUEST_LIMITS.longText + 1)], [1], [null]])(
      'should reject %j',
      (value) => {
        expect(trimmedLongTextSchema.safeParse(value).success).toBe(false);
      }
    );
  });

  describe('requiredLongTextSchema', () => {
    it('should trim the text', () => {
      expect(requiredLongTextSchema.parse('  A family  ')).toBe('A family');
    });

    it('should accept a text at the limit', () => {
      const text = 'x'.repeat(REQUEST_LIMITS.longText);

      expect(requiredLongTextSchema.parse(text)).toBe(text);
    });

    it.each([[''], ['   '], [null], ['x'.repeat(REQUEST_LIMITS.longText + 1)]])(
      'should reject %j',
      (value) => {
        expect(requiredLongTextSchema.safeParse(value).success).toBe(false);
      }
    );
  });

  describe('httpUrlSchema', () => {
    it.each([['https://example.com/a'], ['http://example.org']])(
      'should accept %s',
      (url) => {
        expect(httpUrlSchema.safeParse(url).success).toBe(true);
      }
    );

    it.each([
      ['javascript:alert(1)'],
      ['data:text/html,hi'],
      ['ftp://example.com'],
      ['/relative/path'],
      [`https://example.com/${'x'.repeat(REQUEST_LIMITS.url)}`]
    ])('should reject %s', (url) => {
      expect(httpUrlSchema.safeParse(url).success).toBe(false);
    });
  });

  describe('listSchema', () => {
    const list = listSchema(z.string());

    it('should accept a list at the limit', () => {
      const items = Array.from({ length: REQUEST_LIMITS.listItems }, () => 'a');

      expect(list.safeParse(items).success).toBe(true);
    });

    it('should reject a list over the limit', () => {
      const items = Array.from(
        { length: REQUEST_LIMITS.listItems + 1 },
        () => 'a'
      );

      expect(list.safeParse(items).success).toBe(false);
    });
  });

  describe('boundedRecordSchema', () => {
    const record = boundedRecordSchema(z.string(), z.number());
    const entries = (count: number) =>
      Object.fromEntries(
        Array.from({ length: count }, (_, i) => [`key${i}`, i])
      );

    it('should accept a record at the limit', () => {
      expect(record.safeParse(entries(REQUEST_LIMITS.recordKeys)).success).toBe(
        true
      );
    });

    it('should reject a record over the limit', () => {
      expect(
        record.safeParse(entries(REQUEST_LIMITS.recordKeys + 1)).success
      ).toBe(false);
    });
  });
});
