import httpStatus from 'http-status';

import {
  changeUserRolesRequest,
  lookupUserRequest
} from '../../../../../src/apps/agroApi/controllers/Users/requestSchemas.js';
import { UnprocessableEntityError } from '../../../../../src/shared/errors/index.js';

describe('Users requestSchemas', () => {
  describe('changeUserRolesRequest body', () => {
    const body = changeUserRolesRequest.body;

    it('rejects overlapping add/remove with a 422 before any domain logic', () => {
      let thrown: unknown;
      try {
        body.parse({ add: ['admin'], remove: ['admin'] });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(UnprocessableEntityError);
      expect((thrown as UnprocessableEntityError).statusCode).toBe(
        httpStatus.UNPROCESSABLE_ENTITY
      );
    });

    it('accepts an empty delta (no-op)', () => {
      expect(body.parse({})).toEqual({});
    });

    it('accepts disjoint add/remove', () => {
      expect(body.safeParse({ add: ['admin'] }).success).toBe(true);
    });

    it('rejects the non-manageable base role "user" as a 400 (not a ManageableRole)', () => {
      expect(body.safeParse({ add: ['user'] }).success).toBe(false);
    });

    it('rejects an unknown role name as a 400', () => {
      expect(body.safeParse({ remove: ['superuser'] }).success).toBe(false);
    });
  });

  describe('lookupUserRequest query', () => {
    const query = lookupUserRequest.query;

    it('accepts exactly one of email or username', () => {
      expect(query.safeParse({ email: 'a@example.com' }).success).toBe(true);
      expect(query.safeParse({ username: 'someone' }).success).toBe(true);
    });

    it('rejects neither', () => {
      expect(query.safeParse({}).success).toBe(false);
    });

    it('rejects both', () => {
      expect(
        query.safeParse({ email: 'a@example.com', username: 'someone' }).success
      ).toBe(false);
    });
  });
});
