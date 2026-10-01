import { escapeRegex } from '../../../src/shared/utils/escapeRegex.js';

describe('escapeRegex', () => {
  describe('special characters', () => {
    it.each([
      ['.', '\\.'],
      ['*', '\\*'],
      ['+', '\\+'],
      ['?', '\\?'],
      ['^', '\\^'],
      ['$', '\\$'],
      ['{', '\\{'],
      ['}', '\\}'],
      ['(', '\\('],
      [')', '\\)'],
      ['|', '\\|'],
      ['[', '\\['],
      [']', '\\]'],
      ['\\', '\\\\']
    ])(
      'should escape special character "%s" with a single backslash',
      (char, expected) => {
        const result = escapeRegex(char);

        expect(result).toBe(expected);
      }
    );
  });

  describe('unreserved and safe characters', () => {
    it.each([['ros'], ['Ñandú'], ['é'], ['-'], ['/'], ['a,b']])(
      'should return safe input "%s" unchanged',
      (input) => {
        const result = escapeRegex(input);

        expect(result).toBe(input);
      }
    );
  });

  describe('complex regex patterns', () => {
    it('should escape nested repetition pattern correctly', () => {
      const input = '(a+)+$';

      const result = escapeRegex(input);

      expect(result).toBe('\\(a\\+\\)\\+\\$');
    });
  });
});
