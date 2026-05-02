/* eslint-disable @typescript-eslint/require-await */
import {
  AfterAll,
  BeforeAll,
  Given,
  When,
  Then,
  setWorldConstructor,
  World
} from '@cucumber/cucumber';
import { assert } from 'chai';
import request from 'supertest';
import type { Server } from 'node:http';

import { createAppContainer } from '../../../../../src/apps/agroApi/container.js';
import { EnvironmentArranger } from '../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { AgroBackApp } from '../../../../../src/apps/agroApi/AgroBackApp.js';
import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import type { EncrypterTool } from '../../../../../src/Contexts/shared/plugins/index.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { PlantSeeder } from '../shared/seeders/PlantSeeder.js';
import { assertResponseMatchesOpenAPI } from '../../../../shared/contract/assertResponseMatchesOpenAPI.js';
import { BedSeeder } from '../shared/seeders/BedSeeder.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';

/* ---------------- WORLD ---------------- */

export interface TestWorld {
  plantId?: string;
  bedId?: string;
  token?: string;
  route?: string;
  method?: string;
  status?: number;
  response?: unknown;

  request?: request.Test;
  responseRaw?: request.Response;
}

class TestWorldImpl extends World implements TestWorld {
  plantId?: string;
  bedId?: string;
  token?: string;
  route?: string;
  method?: string;
  status?: number;
  response?: unknown;

  request?: request.Test;
  responseRaw?: request.Response;

  [key: string]: unknown;
}

setWorldConstructor(TestWorldImpl);

type CucumberWorld = TestWorldImpl;

/* ---------------- INFRA ---------------- */

const container = createAppContainer();

const ENVIRONMENT_ARRANGER: Promise<EnvironmentArranger> = Promise.resolve(
  container.resolve<EnvironmentArranger>('environmentArranger')
);

const ENCRYPTER: EncrypterTool = container.resolve<EncrypterTool>('encrypter');

const USER_ID = random.uuid();
const ANOTHER_USER_ID = random.uuid();
const ADMIN_ID = random.uuid();

/* ---------------- HELPERS ---------------- */

const setRequestContext = (
  world: CucumberWorld,
  method: string,
  route: string
) => {
  world.route = route;
  world.method = method;
};

const getAuthToken = (world: CucumberWorld, fallback?: string) => {
  return world.token ?? fallback;
};

/* ---------------- GLOBAL STATE ---------------- */

let app: AgroBackApp;
let httpServer: Server;

let validAdminBearerToken: Nullable<string>;
let validUserBearerToken: Nullable<string>;
let anotherUserBearerToken: Nullable<string>;

let plantSeeder: ReturnType<typeof PlantSeeder>;

/* ---------------- UTILS ---------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPrimitive = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const compareResponseObject = <T extends Record<string, unknown>>(
  responseObj: T,
  expectedObj: Partial<T>
): boolean => {
  const compare = (actual: unknown, expected: unknown): boolean => {
    if (expected === undefined) return true;
    if (expected === null) return actual === null;

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;

      return expected.every((expectedItem) =>
        actual.some((actualItem) => compare(actualItem, expectedItem))
      );
    }

    if (isRecord(expected)) {
      if (!isRecord(actual)) return false;

      return Object.entries(expected).every(([key, value]) =>
        compare(actual[key], value)
      );
    }

    return actual === expected;
  };

  return compare(responseObj, expectedObj);
};

const interpolateRoute = <T extends Record<string, unknown>>(
  route: string,
  world: T
): string =>
  route.replaceAll(/{([^{}]+)}/g, (_, key: string) => {
    const value = world[key];

    if (value === undefined || value === null) {
      throw new Error(`Missing value for route param: ${key}`);
    }

    if (!isPrimitive(value)) {
      throw new Error(`Invalid type for route param "${key}"`);
    }

    return String(value);
  });

const interpolateJson = <T extends Record<string, unknown>>(
  body: string,
  world: T
): string => {
  const parsed = JSON.parse(body);

  const replace = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.replaceAll(/{([^{}]+)}/g, (_, key: string) => {
        const replacement = world[key];

        if (replacement === undefined || replacement === null) {
          throw new Error(`Missing value for json param: ${key}`);
        }

        if (!isPrimitive(replacement)) {
          throw new Error(`Invalid type for json param "${key}"`);
        }

        return String(replacement);
      });
    }

    if (Array.isArray(value)) return value.map(replace);

    if (isRecord(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = replace(v);
      return out;
    }

    return value;
  };

  return JSON.stringify(replace(parsed));
};

/* ---------------- LIFECYCLE ---------------- */

BeforeAll(async () => {
  app = new AgroBackApp({
    host: process.env.HOST || 'http://localhost',
    port: process.env.PORT || '0'
  });

  await app.start(container.resolve('logger'));

  if (!app.httpServer) throw new Error('HTTP server is not available');
  httpServer = app.httpServer;

  await (await ENVIRONMENT_ARRANGER).arrange();

  validAdminBearerToken = await ENCRYPTER.generateToken({
    id: ADMIN_ID,
    email: 'admin@tsapi.com',
    username: UserMother.random().username.value,
    roles: ['admin']
  });

  validUserBearerToken = await ENCRYPTER.generateToken({
    id: USER_ID,
    email: 'user@tsapi.com',
    username: UserMother.random().username.value,
    roles: ['user']
  });

  anotherUserBearerToken = await ENCRYPTER.generateToken({
    id: ANOTHER_USER_ID,
    email: 'anotheruser@tsapi.com',
    username: UserMother.random().username.value,
    roles: ['user']
  });

  plantSeeder = PlantSeeder(app.httpServer, validAdminBearerToken!);
});

AfterAll(async () => {
  await (await ENVIRONMENT_ARRANGER).arrange();
  await (await ENVIRONMENT_ARRANGER).close();
  await app.stop(container.resolve('logger'));
});

/* ---------------- GIVEN ---------------- */

Given('a GET request to {string}', async function (route: string) {
  const normalizedRoute = route.includes('current-user-token')
    ? route.replace('current-user-token', validUserBearerToken ?? '')
    : route;
  setRequestContext(this, 'GET', normalizedRoute);

  this.request = request(httpServer).get(normalizedRoute);
});

Given('a GET user request to {string}', async function (route: string) {
  const normalizedRoute = interpolateRoute(route, this);
  this.route = normalizedRoute;
  this.method = 'GET';

  this.request = request(httpServer)
    .get(normalizedRoute)
    .set(
      'Authorization',
      `Bearer ${getAuthToken(this, validUserBearerToken!)}`
    );
});

Given(
  'a POST request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    this.route = normalizedRoute;
    this.method = 'POST';

    this.request = request(httpServer)
      .post(normalizedRoute)
      .send(JSON.parse(body));
  }
);

Given('an authentication with body', async function (docString: string) {
  const payload = JSON.parse(docString);

  this.request = request(httpServer)
    .post(API_PREFIXES.auth + '/login')
    .send(payload);

  const response = await this.request;

  validUserBearerToken = response.body.token;
  this.token = validUserBearerToken ?? undefined;
});

Given(
  'a POST admin request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    this.route = normalizedRoute;
    this.method = 'POST';

    this.request = request(httpServer)
      .post(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validAdminBearerToken!)}`
      )
      .send(JSON.parse(body));
  }
);

Given(
  'a POST user request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    this.route = normalizedRoute;
    this.method = 'POST';

    this.request = request(httpServer)
      .post(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validUserBearerToken!)}`
      )
      .send(JSON.parse(body));
  }
);

Given('a plant exists', async function (this: CucumberWorld) {
  const plants = await plantSeeder.createMany(2);

  if (plants?.length === 0) {
    throw new Error('PlantSeeder returned empty array');
  }

  this.plantId = plants[0]!.id;
});

Given('no plants exist', async function () {
  await (await ENVIRONMENT_ARRANGER).arrange();
});

Given('a bed exists', async function (this: CucumberWorld) {
  const token = getAuthToken(this, validUserBearerToken!);

  const localBedSeeder = BedSeeder(httpServer, token!);

  const bed = await localBedSeeder.createOne();

  this.bedId = bed.id;
});

Given('a bed exists for another user', async function (this: CucumberWorld) {
  const token = getAuthToken(this, anotherUserBearerToken!);

  const localBedSeeder = BedSeeder(httpServer, token!);

  const bed = await localBedSeeder.createOne();

  this.bedId = bed.id;
});

/* ---------------- WHEN ---------------- */
When(
  'I send a GET admin request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'get', normalizedRoute);

    this.request = request(httpServer)
      .get(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validAdminBearerToken!)}`
      );
  }
);

When(
  'I send a GET user request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'get', normalizedRoute);

    this.request = request(httpServer)
      .get(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validUserBearerToken!)}`
      );
  }
);

When(
  'I send a GET request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalized = interpolateRoute(route, this);

    setRequestContext(this, 'GET', normalized);

    this.request = request(httpServer).get(normalized);
  }
);

When('I get the plant', async function (this: CucumberWorld) {
  if (!this.plantId) throw new Error('plantId not set');

  const route = `/api/v1/plants/${this.plantId}`;

  setRequestContext(this, 'get', route);

  this.request = request(httpServer).get(route);
});

When(
  'I send a PATCH admin request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'patch', normalizedRoute);

    const interpolatedBody = interpolateJson(body, this);

    this.request = request(httpServer)
      .patch(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validAdminBearerToken!)}`
      )
      .send(JSON.parse(interpolatedBody));
  }
);

When(
  'I send a PATCH user request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'patch', normalizedRoute);

    this.request = request(httpServer)
      .patch(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validUserBearerToken!)}`
      )
      .send(JSON.parse(interpolateJson(body, this)));
  }
);

When(
  'I send a PATCH request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'patch', normalizedRoute);

    this.request = request(httpServer)
      .patch(normalizedRoute)
      .send(JSON.parse(interpolateJson(body, this)));
  }
);

When(
  'I send a DELETE admin request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'delete', normalizedRoute);

    this.request = request(httpServer)
      .delete(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validAdminBearerToken!)}`
      );
  }
);

When(
  'I send a DELETE user request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'delete', normalizedRoute);

    this.request = request(httpServer)
      .delete(normalizedRoute)
      .set(
        'Authorization',
        `Bearer ${getAuthToken(this, validUserBearerToken!)}`
      );
  }
);

When(
  'I send a DELETE request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'delete', normalizedRoute);

    this.request = request(httpServer).delete(normalizedRoute);
  }
);

When('I get the bed', async function (this: CucumberWorld) {
  if (!this.bedId) throw new Error('bedId not set');

  const route = `/api/v1/beds/${this.bedId}`;

  setRequestContext(this, 'get', route);

  this.request = request(httpServer)
    .get(route)
    .set(
      'Authorization',
      `Bearer ${getAuthToken(this, validUserBearerToken!)}`
    );
});

/* ---------------- THEN ---------------- */

Then(
  'the response status code should be {int}',
  async function (this: CucumberWorld, status: number) {
    this.status = status;

    const res = await this.request!.expect(status);
    this.responseRaw = res;
    this.response = res;
  }
);

Then('the response body should be empty', async function (this: CucumberWorld) {
  assert.isEmpty(this.responseRaw!.body);
});

Then(
  'the response body should include an auth token',
  async function (this: CucumberWorld) {
    assert.isNotEmpty(this.responseRaw!.body.token);
  }
);

/* resto de THEN igual: responseRaw en vez de _response */

Then(
  'the response body should be',
  async function (this: CucumberWorld, docString: string) {
    assert.deepStrictEqual(
      this.responseRaw!.body,
      JSON.parse(interpolateJson(docString, this))
    );
  }
);

Then(
  'the response body should be a list',
  async function (this: CucumberWorld) {
    const response = await this.request!;
    assert.isArray(response.body);
  }
);

Then(
  'the list should contain at least {int} item',
  async function (this: CucumberWorld, count: number) {
    const response = await this.request!;
    assert.isAtLeast(response.body.length, count);
  }
);

Then(
  'the response body should be an empty list',
  async function (this: CucumberWorld) {
    const response = await this.request!;
    assert.isArray(response.body);
    assert.lengthOf(response.body, 0);
  }
);

Then(
  'the response body should contain',
  async function (this: CucumberWorld, docString: string) {
    const response = await this.request!;

    const expected = JSON.parse(docString) as Partial<PlantPrimitives>;

    if (expected.id === '<plantId>') {
      expected.id = this.plantId!;
    }
    if (expected.id === '<bedId>') {
      expected.id = this.bedId!;
    }

    const matches = compareResponseObject(response.body, expected);

    assert.isTrue(matches, 'Expected response body to match expected');
  }
);

Then(
  'GET {string} returns 404',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    await request(httpServer).get(normalizedRoute).expect(404);
  }
);

Then('response matches OpenAPI contract', async function (this: CucumberWorld) {
  await assertResponseMatchesOpenAPI({
    path: this.route!,
    method: this.method!,
    status: this.status!,
    body: (this.responseRaw as request.Response).body
  });
});
