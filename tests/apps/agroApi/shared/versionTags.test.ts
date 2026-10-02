import type { Response } from 'express';

import {
  getExpectedVersions,
  ifMatchSchema,
  setVersionETag,
  storeExpectedVersions
} from '../../../../src/apps/agroApi/shared/versionTags.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

const buildRes = (locals: Record<string, unknown> = {}) => {
  const set = jest.fn();
  const res = { locals, set } as unknown as Response;

  return { res, set };
};

const tagList = (count: number): string =>
  Array.from({ length: count }, (_, i) => `"${i}"`).join(', ');

describe('versionTags', () => {
  describe('ifMatchSchema', () => {
    it.each([
      ['"3"', [3]],
      ['"0"', [0]],
      [' "3" ', [3]],
      ['"2", "3"', [2, 3]],
      ['"2","3"', [2, 3]],
      ['"2" ,\t"3"', [2, 3]],
      [', "3",', [3]],
      [',,"3",,', [3]],
      ['"9007199254740991"', [Number.MAX_SAFE_INTEGER]],
      ['W/"3"', []],
      ['"abc"', []],
      ['"a,b"', []],
      ['""', []],
      ['"03"', []],
      ['"-1"', []],
      ['"1.5"', []],
      ['"99999999999999999999"', []],
      ['W/"2", "3"', [3]],
      ['"a,b", "4"', [4]],
      [tagList(50), Array.from({ length: 50 }, (_, i) => i)]
    ])('should parse %j into the versions %j', (header, versions) => {
      // Act
      const result = ifMatchSchema.safeParse(header);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(versions);
    });

    it.each([
      ['3'],
      ['"3'],
      ['3"'],
      ['"3" "4"'],
      ['*, "3"'],
      ['*'],
      ['w/"3"'],
      ['W/3'],
      ['"a"b"'],
      [','],
      [''],
      ['"3";'],
      [tagList(51)]
    ])('should reject %j', (header) => {
      // Act
      const result = ifMatchSchema.safeParse(header);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should not echo the header in its message', () => {
      // Act
      const result = ifMatchSchema.safeParse('zz-sentinel');

      // Assert
      expect(result.error?.issues[0]?.message).not.toContain('zz-sentinel');
    });
  });

  describe('setVersionETag', () => {
    it('should set a strong ETag holding the version', () => {
      // Arrange
      const { res, set } = buildRes();

      // Act
      setVersionETag(res, 4);

      // Assert
      expect(set).toHaveBeenCalledWith('ETag', '"4"');
    });
  });

  describe('expected versions', () => {
    it.each([[[3]], [[2, 3]], [[]]])(
      'should round-trip %j through res.locals',
      (versions) => {
        // Arrange
        const { res } = buildRes();

        // Act
        storeExpectedVersions(res, versions);

        // Assert
        expect(getExpectedVersions(res)).toEqual(versions);
      }
    );

    it.each([[undefined], [3], [['3']], [[-1]], [[1.5]]])(
      'should fail with an internal error when locals hold %j',
      (value) => {
        // Arrange
        const { res } = buildRes({ expectedVersions: value });

        // Act
        const read = () => getExpectedVersions(res);

        // Assert
        expect(read).toThrow(HttpError);
      }
    );
  });
});
