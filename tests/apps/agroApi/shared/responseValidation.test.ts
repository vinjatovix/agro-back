import httpStatus from 'http-status';
import { z } from 'zod';

import {
  checkPage,
  checkResponse
} from '../../../../src/apps/agroApi/shared/responseValidation.js';
import type { AppLogger } from '../../../../src/Contexts/shared/plugins/logger.plugin.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

class MockAppLogger implements AppLogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  details: z.object({ size: z.number() })
});

type Item = z.output<typeof itemSchema>;

const validItem = (id: string): Item => ({
  id,
  name: `name-${id}`,
  details: { size: 1 }
});

// Same shape with one contract field of the wrong type.
const brokenItem = (id: string): Record<string, unknown> => ({
  ...validItem(id),
  details: { size: 'secret-stored-value' }
});

const PAGINATION = { page: 2, limit: 3, totalPages: 4, totalItems: 11 };

const expectInternalError = (action: () => unknown): void => {
  let caught: unknown;

  try {
    action();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(HttpError);
  expect((caught as HttpError).statusCode).toBe(
    httpStatus.INTERNAL_SERVER_ERROR
  );
};

const loggedEntry = (logger: MockAppLogger): [string, unknown] => {
  expect(logger.error).toHaveBeenCalledTimes(1);

  return logger.error.mock.calls[0] as [string, unknown];
};

describe('responseValidation', () => {
  let logger: MockAppLogger;

  beforeEach(() => {
    logger = new MockAppLogger();
  });

  describe('checkResponse', () => {
    it('returns a copy without unknown keys when the body fits', () => {
      const body = {
        ...validItem('a'),
        internalNote: 'x',
        details: { size: 1, hidden: true }
      };

      const result = checkResponse(itemSchema, body, {
        resource: 'Plant',
        id: 'a',
        logger
      });

      expect(result).toEqual(validItem('a'));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs one entry with the id and issue paths and throws a 500', () => {
      expectInternalError(() =>
        checkResponse(itemSchema, brokenItem('plant-id'), {
          resource: 'Plant',
          id: 'plant-id',
          logger
        })
      );

      const [message, details] = loggedEntry(logger);

      expect(message).toContain('Plant');
      expect(message).toContain('plant-id');
      expect(details).toMatchObject({
        resource: 'Plant',
        failures: [
          { id: 'plant-id', issues: [expect.stringContaining('details.size')] }
        ]
      });
    });

    it('never logs the stored values', () => {
      expectInternalError(() =>
        checkResponse(itemSchema, brokenItem('a'), {
          resource: 'Family',
          id: 'a',
          logger
        })
      );

      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
        'secret-stored-value'
      );
    });
  });

  describe('checkPage', () => {
    it('returns the stripped items and passes the pagination through', () => {
      const page = {
        data: [{ ...validItem('a'), extra: 1 }, validItem('b')],
        pagination: PAGINATION
      };

      const result = checkPage(itemSchema, page, {
        resource: 'Family',
        logger
      });

      expect(result).toEqual({
        data: [validItem('a'), validItem('b')],
        pagination: PAGINATION
      });
    });

    it('returns an empty page unchanged', () => {
      const page = { data: [], pagination: PAGINATION };

      expect(
        checkPage(itemSchema, page, { resource: 'Plant', logger })
      ).toEqual(page);
    });

    it('logs every failing id in one entry and throws without returning data', () => {
      const page = {
        data: [
          brokenItem('first-id'),
          validItem('second-id'),
          brokenItem('third-id')
        ] as Array<{
          id: string;
        }>,
        pagination: PAGINATION
      };

      expectInternalError(() =>
        checkPage(itemSchema, page, { resource: 'Plant', logger })
      );

      const [message, details] = loggedEntry(logger);

      expect(message).toContain('first-id');
      expect(message).toContain('third-id');
      expect(message).not.toContain('second-id');
      expect(details).toMatchObject({
        resource: 'Plant',
        failures: [{ id: 'first-id' }, { id: 'third-id' }]
      });
    });
  });
});
