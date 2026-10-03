import { DataTable, Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import request from 'supertest';

import {
  assertField,
  buildRequest,
  compareResponseObject,
  currentResponse,
  interpolateJson,
  interpolateRoute,
  parseJsonObject,
  suite,
  toHeaderRecord,
  tokenFor,
  valueAtPath,
  type AgroWorld,
  type MatchRow,
  type operators,
  type Role
} from './utils/index.js';

const expectedObject = (
  world: AgroWorld,
  docString: string
): Record<string, unknown> =>
  parseJsonObject(interpolateJson(docString, world.placeholders())) as Record<
    string,
    unknown
  >;

async function getResponseData(world: AgroWorld): Promise<unknown[]> {
  const body = (await currentResponse(world)).body as { data?: unknown };

  assert.isArray(body.data);

  return body.data as unknown[];
}

const listedValues = async (
  world: AgroWorld,
  field: string
): Promise<string[]> =>
  (await getResponseData(world)).map((item) =>
    String(valueAtPath(item, field))
  );

const csvValues = (csv: string): string[] =>
  csv === '' ? [] : csv.split(',').map((value) => value.trim());

Then(
  'the response status code should be {int}',
  async function (this: AgroWorld, status: number) {
    assert.exists(this.request, 'No request was sent in this scenario');

    await this.request.expect(status);
  }
);

Then('the response body should be empty', async function (this: AgroWorld) {
  assert.isEmpty((await currentResponse(this)).body);
});

Then(
  'the response body should be',
  async function (this: AgroWorld, docString: string) {
    assert.deepStrictEqual(
      (await currentResponse(this)).body,
      JSON.parse(interpolateJson(docString, this.placeholders()))
    );
  }
);

Then('the response body should be a list', async function (this: AgroWorld) {
  const response = await currentResponse(this);

  assert.isArray(response.body);
});

Then(
  'the response body should contain a paginated list',
  async function (this: AgroWorld) {
    const response = (await currentResponse(this)) as {
      body: {
        data: unknown[];
        pagination: Record<string, unknown>;
      };
    };

    assert.containsAllKeys(response.body, ['data', 'pagination']);
    assert.isArray(response.body.data);
    assert.containsAllKeys(response.body.pagination, [
      'page',
      'limit',
      'totalPages',
      'totalItems'
    ]);
  }
);

Then(
  'the list should contain at least {int} item',
  async function (this: AgroWorld, count: number) {
    const response = (await currentResponse(this)) as {
      body: unknown[] | { data: unknown[] };
    };

    if (Array.isArray(response.body)) {
      assert.isAtLeast(response.body.length, count);
      return;
    }

    assert.isArray(response.body.data);
    assert.isAtLeast(response.body.data.length, count);
  }
);

Then('the list should be empty', async function (this: AgroWorld) {
  const response = (await currentResponse(this)) as {
    body: { data: unknown[] };
  };

  assert.isArray(response.body.data);
  assert.lengthOf(response.body.data, 0);
});

Then(
  'every item should match:',
  async function (this: AgroWorld, dataTable: DataTable) {
    const placeholders = this.placeholders();
    const rows: MatchRow[] = dataTable.hashes().map((row) => ({
      field: interpolateRoute(row.field as string, placeholders),
      operator: row.operator as keyof typeof operators,
      value: interpolateRoute(row.value as string, placeholders)
    }));

    const items = await getResponseData(this);

    for (const item of items) {
      for (const row of rows) {
        assertField(item, row.field, row.operator, row.value);
      }
    }
  }
);

Then(
  'the listed {string} should be {string}',
  async function (this: AgroWorld, field: string, expected: string) {
    assert.deepEqual(await listedValues(this, field), csvValues(expected));
  }
);

Then(
  'the listed {string} should be exactly {string} in any order',
  async function (this: AgroWorld, field: string, expected: string) {
    assert.sameMembers(await listedValues(this, field), csvValues(expected));
  }
);

Then(
  'the response body should contain',
  async function (this: AgroWorld, docString: string) {
    const response = await currentResponse(this);

    const matches = compareResponseObject(
      response.body,
      expectedObject(this, docString)
    );

    assert.isTrue(matches, 'Expected response body to match expected');
  }
);

Then(
  'the response body should not contain',
  async function (this: AgroWorld, docString: string) {
    const response = await currentResponse(this);

    const expected = expectedObject(this, docString);

    assert.isDefined(response.body, 'Response body is undefined');

    const hasMatch = compareResponseObject(response.body, expected);

    assert.isFalse(
      hasMatch,
      `Expected response NOT to contain: ${JSON.stringify(expected)}`
    );
  }
);

Then(
  'the response header {string} should include {string}',
  async function (this: AgroWorld, header: string, expected: string) {
    const value = toHeaderRecord((await currentResponse(this)).headers)[
      header.toLowerCase()
    ];

    assert.exists(value, `Missing response header ${header}`);

    const items = [value]
      .flat()
      .flatMap((entry) => entry.split(','))
      .map((item) => item.trim().toLowerCase());

    assert.include(items, expected.toLowerCase());
  }
);

Then(
  'the response errors should include {string}',
  async function (this: AgroWorld, key: string) {
    const body = (await currentResponse(this)).body as { errors?: unknown };

    assert.isObject(body.errors, 'Response body has no errors object');
    assert.property(body.errors, key);
  }
);

Then(
  'the response errors should not include {string}',
  async function (this: AgroWorld, key: string) {
    const body = (await currentResponse(this)).body as { errors?: unknown };

    assert.isObject(body.errors, 'Response body has no errors object');
    assert.notProperty(body.errors, key);
  }
);

Then(
  'the response body should not echo {string}',
  async function (this: AgroWorld, value: string) {
    assert.notInclude(
      JSON.stringify((await currentResponse(this)).body),
      value
    );
  }
);

Then(
  'the response body matches {string} for field {string}',
  async function (this: AgroWorld, expected: string, field: string) {
    const interpolated = interpolateRoute(expected, this.placeholders());
    const body: unknown = (await currentResponse(this)).body;
    const actual = valueAtPath(body, field);
    assert.strictEqual(String(actual), interpolated);
  }
);

// Read-back checks: they send their own request and leave the scenario's
// request context (route, method, response) untouched.

Then(
  'GET {string} returns 404',
  async function (this: AgroWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this.placeholders());

    await request(suite().httpServer).get(normalizedRoute).expect(404);
  }
);

Then(
  'a GET user request to {string} should return a body containing',
  async function (this: AgroWorld, route: string, docString: string) {
    const response = await buildRequest({
      method: 'get',
      route: interpolateRoute(route, this.placeholders()),
      token: tokenFor(this, 'user')
    }).expect(200);

    const expected = expectedObject(this, docString);

    assert.isTrue(
      compareResponseObject(response.body, expected),
      `Expected ${JSON.stringify(response.body)} to contain ${JSON.stringify(expected)}`
    );
  }
);

Then(
  'a GET {role} request to {string} should return the same body',
  async function (this: AgroWorld, role: Role, route: string) {
    const response = await buildRequest({
      method: 'get',
      route: interpolateRoute(route, this.placeholders()),
      token: tokenFor(this, role)
    }).expect(200);

    assert.deepEqual(response.body, (await currentResponse(this)).body);
  }
);

Then(
  'a GET {role} request to {string} should return status {int}',
  async function (this: AgroWorld, role: Role, route: string, status: number) {
    await buildRequest({
      method: 'get',
      route: interpolateRoute(route, this.placeholders()),
      token: tokenFor(this, role)
    }).expect(status);
  }
);
