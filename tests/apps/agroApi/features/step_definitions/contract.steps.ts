import path from 'node:path';
import { Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import { assertResponseMatchesOpenApi } from 'pure-openapi-assert';

import {
  currentResponse,
  toHeaderRecord,
  type AgroWorld
} from './utils/index.js';

const OPENAPI_SPEC_PATH = path.resolve(
  process.cwd(),
  'src/apps/agroApi/openapi/openapi.yaml'
);

Then('response matches OpenAPI contract', async function (this: AgroWorld) {
  const { route, method } = this;
  assert.exists(route, 'No request route in this scenario');
  assert.exists(method, 'No request method in this scenario');

  const responses = this.responses ?? [await currentResponse(this)];

  for (const response of responses) {
    await assertResponseMatchesOpenApi({
      specPath: OPENAPI_SPEC_PATH,
      path: route,
      method,
      status: response.status,
      body: response.body,
      headers: toHeaderRecord(response.headers)
    });
  }
});
