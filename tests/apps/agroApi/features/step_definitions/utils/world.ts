import { World } from '@cucumber/cucumber';
import type request from 'supertest';

import type { Nullable } from '../../../../../../src/shared/domain/types/Nullable.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type PlaceholderKey =
  | 'bedId'
  | 'plantId'
  | 'familyId'
  | 'familySlug'
  | 'familyName'
  | 'otherFamilyId';

const PLACEHOLDER_KEYS: readonly PlaceholderKey[] = [
  'bedId',
  'plantId',
  'familyId',
  'familySlug',
  'familyName',
  'otherFamilyId'
];

/** Scenario context: built fresh by Cucumber for every scenario. */
export class AgroWorld extends World {
  bedId?: string;
  plantId?: string;
  familyId?: string;
  familySlug?: string;
  familyName?: string;
  otherFamilyId?: string;

  loggedInToken?: string;
  loggedInEmail?: string;

  route?: string;
  method?: HttpMethod;
  ifMatch?: string;
  ifNoneMatch?: string;
  request?: request.Test;

  responses?: request.Response[];
  storedDocument?: Nullable<Record<string, unknown>>;

  /** Values that `<key>` placeholders in routes and bodies can read. */
  placeholders(): Readonly<Partial<Record<PlaceholderKey, string>>> {
    const values: Partial<Record<PlaceholderKey, string>> = {};

    for (const key of PLACEHOLDER_KEYS) {
      const value = this[key];
      if (value !== undefined) {
        values[key] = value;
      }
    }

    return values;
  }
}
