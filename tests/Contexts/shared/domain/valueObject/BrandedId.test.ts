import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import type { Brand } from '../../../../../src/Contexts/shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../../../src/Contexts/shared/domain/valueObject/BrandedId.js';
import { random } from '../../fixtures/random.js';

type TestEntityId = Brand<string, 'TestEntityId'>;

describe('BrandedId', () => {
  const generator = createIdGenerator<TestEntityId>('TestEntityId');
  const VALID_V4 = random.legacyUuid();
  const VALID_V7 = random.uuid();
  const UUID_V7_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  describe('create', () => {
    it.each([
      ['UUIDv4', VALID_V4],
      ['UUIDv7', VALID_V7],
      ['dynamically generated UUIDv4', uuidv4()],
      ['dynamically generated UUIDv7', uuidv7()]
    ])(
      'should create a valid branded ID for valid %s',
      (_description, value) => {
        const result = generator.create(value);

        expect(result).toBe(value);
      }
    );

    it('should trim surrounding whitespace', () => {
      const result = generator.create(`  ${VALID_V7}  `);

      expect(result).toBe(VALID_V7);
    });

    it.each([
      ['empty string', ''],
      ['non-uuid text', 'not-a-valid-uuid'],
      ['truncated UUID', '550e8400-e29b-41d4-a716'],
      ['too long string', `${VALID_V4}extra`]
    ])(
      'should throw InvalidArgumentException when value is %s',
      (_description, invalidValue) => {
        expect(() => generator.create(invalidValue)).toThrow(
          InvalidArgumentException
        );
      }
    );
  });

  describe('random', () => {
    it('should generate a valid UUIDv7 format', () => {
      const result = generator.random();

      expect(result).toMatch(UUID_V7_REGEX);
    });

    it('should generate distinct IDs on subsequent calls', () => {
      const firstId = generator.random();
      const secondId = generator.random();

      expect(firstId).not.toBe(secondId);
    });

    it('should generate chronologically sortable IDs over time', () => {
      jest.useFakeTimers();
      try {
        const firstId = generator.random();
        jest.advanceTimersByTime(1000);
        const secondId = generator.random();

        const comparison = firstId.localeCompare(secondId);

        expect(comparison).toBeLessThan(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
