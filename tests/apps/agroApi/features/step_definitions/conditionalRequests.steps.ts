import { Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import {
  currentResponse,
  interpolateRoute,
  sendConcurrently,
  type AgroWorld
} from './utils/index.js';

Given('I use If-Match {string}', function (this: AgroWorld, value: string) {
  this.ifMatch = interpolateRoute(value, this.placeholders());
});

Given(
  'I use If-None-Match {string}',
  function (this: AgroWorld, value: string) {
    this.ifNoneMatch = interpolateRoute(value, this.placeholders());
  }
);

for (const role of ['user', 'admin'] as const) {
  When(
    `I send {int} concurrent PATCH ${role} requests to {string} with body`,
    async function (
      this: AgroWorld,
      count: number,
      route: string,
      body: string
    ) {
      await sendConcurrently(this, count, {
        method: 'PATCH',
        route,
        role,
        body,
        conditional: true
      });
    }
  );

  When(
    `I send {int} concurrent DELETE ${role} requests to {string}`,
    async function (this: AgroWorld, count: number, route: string) {
      await sendConcurrently(this, count, {
        method: 'DELETE',
        route,
        role,
        conditional: true
      });
    }
  );
}

Then(
  'exactly {int} response(s) should have status {int} and the rest {int}',
  function (
    this: AgroWorld,
    winners: number,
    winnerStatus: number,
    loserStatus: number
  ) {
    assert.exists(this.responses, 'No concurrent responses recorded');

    const statuses = this.responses.map((response) => response.status);
    const winnerCount = statuses.filter((s) => s === winnerStatus).length;
    const loserCount = statuses.filter((s) => s === loserStatus).length;

    assert.strictEqual(
      winnerCount,
      winners,
      `Expected ${winners} × ${winnerStatus}, got statuses ${JSON.stringify(statuses)}`
    );
    assert.strictEqual(
      loserCount,
      statuses.length - winners,
      `Expected the rest to be ${loserStatus}, got statuses ${JSON.stringify(statuses)}`
    );
  }
);

Then(
  'the response should have ETag {string}',
  async function (this: AgroWorld, expected: string) {
    assert.strictEqual(
      (await currentResponse(this)).headers.etag,
      interpolateRoute(expected, this.placeholders())
    );
  }
);

Then(
  'the response ETag should match the body version',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const { version } = response.body as { version?: unknown };

    if (typeof version !== 'number') {
      assert.fail('Response body has no numeric version');
    }

    assert.strictEqual(response.headers.etag, `"${version}"`);
  }
);

Then('the response should not have an ETag', async function (this: AgroWorld) {
  assert.notProperty((await currentResponse(this)).headers, 'etag');
});
