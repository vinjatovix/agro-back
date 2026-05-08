/* eslint-disable @typescript-eslint/require-await */
import {
  AfterAll,
  Before,
  BeforeAll,
  Given,
  setWorldConstructor,
  Then,
  When,
  World
} from '@cucumber/cucumber';
import { assert } from 'chai';
import type { MongoClient } from 'mongodb';
import type { Server } from 'node:http';
import request from 'supertest';

import { AgroBackApp } from '../../../../../src/apps/agroApi/AgroBackApp.js';
import {
  createAppContainer,
  type AppContainer
} from '../../../../../src/apps/agroApi/container.js';
import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';
import type { EncrypterTool } from '../../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { EnvironmentArranger } from '../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../src/shared/infrastructure/persistence/index.js';

import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { assertResponseMatchesOpenAPI } from '../../../../shared/contract/assertResponseMatchesOpenAPI.js';

import {
  BedSeeder,
  FamilySeeder,
  PlantSeeder
} from '../shared/seeders/index.js';

import {
  compareResponseObject,
  interpolateJson,
  interpolateRoute,
  parseJsonObject
} from './utils/index.js';

/* ---------------- WORLD ---------------- */

class TestWorldImpl extends World {
  familyId?: string;
  familySlug?: string;
  plantId?: string;
  bedId?: string;
  token?: string;

  route?: string;
  method?: string;
  status?: number;

  request?: request.Test;
  responseRaw?: request.Response;

  [key: string]: unknown;
}

setWorldConstructor(TestWorldImpl);

type CucumberWorld = TestWorldImpl;

/* ---------------- INFRA ---------------- */

const USER_ID = random.uuid();
const ANOTHER_USER_ID = random.uuid();
const ADMIN_ID = random.uuid();

/* ---------------- GLOBAL STATE ---------------- */

let app: AgroBackApp;
let httpServer: Server;

let validAdminBearerToken: Nullable<string>;
let validUserBearerToken: Nullable<string>;
let anotherUserBearerToken: Nullable<string>;

let plantSeeder: ReturnType<typeof PlantSeeder>;
let familySeeder: ReturnType<typeof FamilySeeder>;

let client: MongoClient;
let container: AppContainer;
let environmentArranger: Promise<EnvironmentArranger>;

/* ---------------- TYPES ---------------- */

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

interface RequestOptions {
  method: HttpMethod;
  route: string;
  token?: string;
  body?: unknown;
}

/* ---------------- HELPERS ---------------- */

const setRequestContext = (
  world: CucumberWorld,
  method: string,
  route: string
): void => {
  world.route = route;
  world.method = method;
};

const getAuthToken = (
  world: CucumberWorld,
  fallback?: string
): string | undefined => {
  return world.token ?? fallback;
};

const withToken = (token?: string): { token: string } | object => {
  return token ? { token } : {};
};

const buildRequest = ({
  method,
  route,
  token,
  body
}: RequestOptions): request.Test => {
  let req = request(httpServer)[method](route);

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (body !== undefined && body !== null) {
    req = req.send(body);
  }

  return req;
};

const parseBody = (
  body: string,
  world: CucumberWorld
): Record<string, unknown> => {
  const parsed = parseJsonObject(interpolateJson(body, world));

  if (Array.isArray(parsed)) {
    throw new TypeError('Expected object but received array in request body');
  }

  return parsed;
};

/* ---------------- LIFECYCLE ---------------- */

BeforeAll(async () => {
  client = await DBClientFactory.createClient(
    'agroApi',
    DBConfigFactory.createConfig()
  );

  const db = client.db();

  container = createAppContainer({ db, client });

  environmentArranger = Promise.resolve(
    container.resolve<EnvironmentArranger>('environmentArranger')
  );

  app = new AgroBackApp({
    host: process.env.HOST || 'http://localhost',
    port: process.env.PORT || '0'
  });

  await app.start(container.resolve('logger'));

  if (!app.httpServer) {
    throw new Error('HTTP server is not available');
  }

  httpServer = app.httpServer;

  const ENCRYPTER: EncrypterTool =
    container.resolve<EncrypterTool>('encrypter');

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

  familySeeder = FamilySeeder(httpServer, validAdminBearerToken!);

  plantSeeder = PlantSeeder(httpServer, validAdminBearerToken!);
});

Before(async () => {
  await (await environmentArranger).arrange();
});

AfterAll(async () => {
  await (await environmentArranger).close();

  await app.stop(container.resolve('logger'));

  await client.close();
});

/* ---------------- GIVEN ---------------- */

Given('a GET request to {string}', async function (route: string) {
  const normalizedRoute = route.includes('current-user-token')
    ? route.replace('current-user-token', validUserBearerToken ?? '')
    : route;

  setRequestContext(this, 'GET', normalizedRoute);

  this.request = buildRequest({
    method: 'get',
    route: normalizedRoute
  });
});

Given('a GET user request to {string}', async function (route: string) {
  const normalizedRoute = interpolateRoute(route, this);

  setRequestContext(this, 'GET', normalizedRoute);

  const token = getAuthToken(this, validUserBearerToken!);

  this.request = buildRequest({
    method: 'get',
    route: normalizedRoute,
    ...withToken(token)
  });
});

Given(
  'a POST request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'POST', normalizedRoute);

    this.request = buildRequest({
      method: 'post',
      route: normalizedRoute,
      body: parseBody(body, this)
    });
  }
);

Given(
  'a POST admin request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'POST', normalizedRoute);

    const token = getAuthToken(this, validAdminBearerToken!);

    this.request = buildRequest({
      method: 'post',
      route: normalizedRoute,
      ...withToken(token),
      body: parseBody(body, this)
    });
  }
);

Given(
  'a POST user request to {string} with body',
  async function (route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'POST', normalizedRoute);

    const token = getAuthToken(this, validUserBearerToken!);

    this.request = buildRequest({
      method: 'post',
      route: normalizedRoute,
      ...withToken(token),
      body: parseBody(body, this)
    });
  }
);

Given('an authentication with body', async function (docString: string) {
  const payload = parseJsonObject(docString);

  this.request = buildRequest({
    method: 'post',
    route: API_PREFIXES.auth + '/login',
    body: payload
  });

  const response = (await this.request) as {
    body: {
      token?: string;
    };
  };

  validUserBearerToken = response.body.token ?? validUserBearerToken;

  this.token = validUserBearerToken ?? undefined;
});

Given('a family exists', async function () {
  const family = await familySeeder.create();

  this.familyId = family.id;
  this.familySlug = family.slug;
});

Given('a plant exists', async function (this: CucumberWorld) {
  const plants = await plantSeeder.createMany(2, {
    'identity.familyId': this.familyId
  });

  this.plantId = plants[0]!.id;
});

Given('no plants exist', async function () {
  await (await environmentArranger).arrange();
});

Given('a bed exists', async function () {
  const token = getAuthToken(this, validUserBearerToken!);

  const localBedSeeder = BedSeeder(httpServer, token!);

  const bed = await localBedSeeder.createOne({});

  this.bedId = bed.id;
});

Given('a bed exists for another user', async function () {
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

    setRequestContext(this, 'GET', normalizedRoute);

    const token = getAuthToken(this, validAdminBearerToken!);

    this.request = buildRequest({
      method: 'get',
      route: normalizedRoute,
      ...withToken(token)
    });
  }
);

When(
  'I send a GET user request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'GET', normalizedRoute);

    const token = getAuthToken(this, validUserBearerToken!);

    this.request = buildRequest({
      method: 'get',
      route: normalizedRoute,
      ...withToken(token)
    });
  }
);

When(
  'I send a GET request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'GET', normalizedRoute);

    this.request = buildRequest({
      method: 'get',
      route: normalizedRoute
    });
  }
);

When('I get the plant', async function (this: CucumberWorld) {
  if (!this.plantId) {
    throw new Error('plantId not set');
  }

  const route = `/api/v1/plants/${this.plantId}`;

  setRequestContext(this, 'GET', route);

  this.request = buildRequest({
    method: 'get',
    route
  });
});

When(
  'I send a PATCH admin request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'PATCH', normalizedRoute);

    const token = getAuthToken(this, validAdminBearerToken!);

    this.request = buildRequest({
      method: 'patch',
      route: normalizedRoute,
      ...withToken(token),
      body: parseBody(body, this)
    });
  }
);

When(
  'I send a PATCH user request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'PATCH', normalizedRoute);

    const token = getAuthToken(this, validUserBearerToken!);

    this.request = buildRequest({
      method: 'patch',
      route: normalizedRoute,
      ...withToken(token),
      body: parseBody(body, this)
    });
  }
);

When(
  'I send a PATCH request to {string} with body',
  async function (this: CucumberWorld, route: string, body: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'PATCH', normalizedRoute);

    this.request = buildRequest({
      method: 'patch',
      route: normalizedRoute,
      body: parseBody(body, this)
    });
  }
);

When(
  'I send a DELETE admin request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'DELETE', normalizedRoute);

    const token = getAuthToken(this, validAdminBearerToken!);

    this.request = buildRequest({
      method: 'delete',
      route: normalizedRoute,
      ...withToken(token)
    });
  }
);

When(
  'I send a DELETE user request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'DELETE', normalizedRoute);

    const token = getAuthToken(this, validUserBearerToken!);

    this.request = buildRequest({
      method: 'delete',
      route: normalizedRoute,
      ...withToken(token)
    });
  }
);

When(
  'I send a DELETE request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'DELETE', normalizedRoute);

    this.request = buildRequest({
      method: 'delete',
      route: normalizedRoute
    });
  }
);

When('I get the bed', async function (this: CucumberWorld) {
  if (!this.bedId) {
    throw new Error('bedId not set');
  }

  const route = `/api/v1/beds/${this.bedId}`;

  setRequestContext(this, 'GET', route);

  const token = getAuthToken(this, validUserBearerToken!);

  this.request = buildRequest({
    method: 'get',
    route,
    ...withToken(token)
  });
});

/* ---------------- THEN ---------------- */

Then(
  'the response status code should be {int}',
  async function (this: CucumberWorld, status: number) {
    this.status = status;

    const response = await this.request!.expect(status);

    this.responseRaw = response;
  }
);

Then('the response body should be empty', async function (this: CucumberWorld) {
  assert.isEmpty(this.responseRaw!.body);
});

Then(
  'the response body should include an auth token',
  async function (this: CucumberWorld) {
    const body = this.responseRaw?.body as {
      token?: string;
    };

    assert.isNotEmpty(body.token);
  }
);

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
    const response = (await this.request!) as {
      body: unknown[];
    };

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

    const expected = parseJsonObject(
      interpolateJson(docString, this)
    ) as Record<string, unknown>;

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
    body: this.responseRaw!.body
  });
});
