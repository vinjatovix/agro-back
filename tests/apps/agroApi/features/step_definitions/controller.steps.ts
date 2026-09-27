/* eslint-disable @typescript-eslint/require-await */
import {
  AfterAll,
  Before,
  BeforeAll,
  DataTable,
  defineParameterType,
  Given,
  setWorldConstructor,
  Then,
  When,
  World
} from '@cucumber/cucumber';
import { assert } from 'chai';
import type { Binary, Collection, MongoClient } from 'mongodb';
import type { Server } from 'node:http';
import path from 'node:path';
import { assertResponseMatchesOpenApi } from 'pure-openapi-assert';
import request from 'supertest';

import { AgroBackApp } from '../../../../../src/apps/agroApi/AgroBackApp.js';
import {
  createAppContainer,
  type AppContainer
} from '../../../../../src/apps/agroApi/container.js';
import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';
import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type { EncrypterTool } from '../../../../../src/Contexts/shared/plugins/index.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { EnvironmentArranger } from '../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../src/shared/infrastructure/persistence/index.js';

import { PlantInstanceMother } from '../../../../Contexts/Agro/PlantInstances/domain/mothers/PlantInstanceMother.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';

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

const operators = {
  eq: (a: unknown, b: unknown) => a === b,

  hasAny: (a: unknown[], b: unknown[]) => b.some((v) => a.includes(v)),

  contains: (a: string, b: string) => a.includes(b),

  startsWith: (a: string, b: string) => a.startsWith(b),

  endsWith: (a: string, b: string) => a.endsWith(b)
};

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce((acc, key) => {
    if (typeof acc === 'object' && acc !== null && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj);

function parseExpected(value: string): unknown {
  if (value.includes(',')) {
    return value.split(',').map((v) => v.trim());
  }

  if (!Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
}

function assertField(
  item: unknown,
  field: string,
  operator: keyof typeof operators,
  expected: string
): void {
  const actual = get(item, field);

  const parsedExpected = parseExpected(expected);

  const fn = operators[operator];

  assert.exists(fn, `Operator "${operator}" not supported`);

  const result = fn(actual as never, parsedExpected as never);

  assert.isTrue(
    result,
    `Expected field "${field}" with value ${JSON.stringify(actual)} to satisfy ${operator} ${JSON.stringify(parsedExpected)}`
  );
}

/* ---------------- WORLD ---------------- */

class TestWorldImpl extends World {
  familyId?: string;
  familySlug?: string;
  familyName?: string;
  plantId?: string;
  bedId?: string;
  token?: string | undefined;
  loggedInEmail?: string;
  storedDocument?: Nullable<Record<string, unknown>>;

  route?: string;
  method?: string;
  status?: number;

  ifMatch?: string;
  ifNoneMatch?: string;

  request?: request.Test;
  responseRaw?: request.Response;
  responses?: request.Response[];

  [key: string]: unknown;
}

setWorldConstructor(TestWorldImpl);

type CucumberWorld = TestWorldImpl;

/* ---------------- INFRA ---------------- */

const USER_ID = random.uuid();
const ANOTHER_USER_ID = random.uuid();
const ADMIN_ID = random.uuid();
const COLLABORATOR_ID = random.uuid();

/* ---------------- GLOBAL STATE ---------------- */

let app: AgroBackApp;
let httpServer: Server;

let validAdminBearerToken: Nullable<string>;
let validUserBearerToken: Nullable<string>;
let anotherUserBearerToken: Nullable<string>;
let validCollaboratorBearerToken: Nullable<string>;

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
  ifMatch?: string | undefined;
  ifNoneMatch?: string | undefined;
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
  body,
  ifMatch,
  ifNoneMatch
}: RequestOptions): request.Test => {
  let req = request(httpServer)[method](route);

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (ifMatch !== undefined) {
    req = req.set('If-Match', ifMatch);
  }

  if (ifNoneMatch !== undefined) {
    req = req.set('If-None-Match', ifNoneMatch);
  }

  if (body !== undefined && body !== null) {
    req = req.send(body);
  }

  return req;
};

function buildGetRequestWithQuery(
  this: CucumberWorld,
  route: string,
  docString: string,
  token?: string
) {
  const normalizedRoute = interpolateRoute(route, this);

  const query = encodeURIComponent(docString);

  return buildRequest({
    method: 'get',
    route: `${normalizedRoute}?query=${query}`,
    ...(token ? withToken(token) : {})
  });
}

type RawDocument = { _id: Binary | string } & Record<string, unknown>;

const rawCollection = (name: string): Collection<RawDocument> =>
  client.db().collection<RawDocument>(name);

const softDeleteDocument = async (
  collectionName: string,
  id: string,
  fields: Record<string, unknown>
): Promise<Nullable<Record<string, unknown>>> => {
  const collection = rawCollection(collectionName);
  const filter = { _id: toMongoId(id) };

  const result = await collection.updateOne(filter, { $set: fields });

  assert.strictEqual(
    result.matchedCount,
    1,
    `Expected to soft-delete ${collectionName} document ${id}`
  );

  return collection.findOne(filter);
};

const assertDocumentUnchanged = async (
  world: CucumberWorld,
  collectionName: string,
  id: string | undefined
): Promise<void> => {
  assert.exists(id, `${collectionName} id not set`);
  assert.exists(world.storedDocument, 'No stored document to compare with');

  const current = await rawCollection(collectionName).findOne({
    _id: toMongoId(id)
  });

  assert.deepEqual(current, world.storedDocument);
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

const recordDocument = async (
  world: CucumberWorld,
  collectionName: string,
  id: string | undefined
): Promise<void> => {
  assert.exists(id, `${collectionName} id not set`);

  world.storedDocument = await rawCollection(collectionName).findOne({
    _id: toMongoId(id)
  });

  assert.exists(world.storedDocument, `${collectionName} ${id} not found`);
};

type Resource = 'bed' | 'plant' | 'family';

const RESOURCES: Record<
  Resource,
  { collection: string; idKey: 'bedId' | 'plantId' | 'familyId' }
> = {
  bed: { collection: 'beds', idKey: 'bedId' },
  plant: { collection: 'plants', idKey: 'plantId' },
  family: { collection: 'families', idKey: 'familyId' }
};

defineParameterType({
  name: 'role',
  regexp: /user|admin/,
  transformer: (value: string): 'user' | 'admin' =>
    value === 'admin' ? 'admin' : 'user'
});

defineParameterType({
  name: 'resource',
  regexp: /bed|plant|family/,
  transformer: (value: string): Resource => {
    if (value === 'plant' || value === 'family') return value;
    return 'bed';
  }
});

const tokenFor = (role: 'user' | 'admin'): string | undefined =>
  (role === 'admin' ? validAdminBearerToken : validUserBearerToken) ??
  undefined;

const sendConcurrently = async (
  world: CucumberWorld,
  count: number,
  build: () => request.Test
): Promise<void> => {
  world.responses = await Promise.all(
    Array.from({ length: count }, async () => build())
  );
};

const openApiSpecPath = (): string =>
  path.resolve(process.cwd(), 'src/apps/agroApi/openapi/openapi.yaml');

const toHeaderRecord = (
  headers: Record<string, unknown>
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.map(String);
    }
  }

  return result;
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

  validCollaboratorBearerToken = await ENCRYPTER.generateToken({
    id: COLLABORATOR_ID,
    email: 'collaborator@tsapi.com',
    username: UserMother.random().username.value,
    roles: ['collaborator']
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

Given(
  'an authentication with body',
  async function (this: CucumberWorld, docString: string) {
    const payload = parseJsonObject(docString);

    if (Array.isArray(payload) || typeof payload.email !== 'string') {
      throw new Error('Authentication body must include an email');
    }

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
    this.loggedInEmail = payload.email;
  }
);

Given('a family exists', async function () {
  const family = await familySeeder.create();

  this.familyId = family.id;
  this.familySlug = family.slug;
  this.familyName = family.name;
});

Given('multiple families exist', async function () {
  const families = await familySeeder.seed();

  this.familyId = families[0]!.id;
  this.familySlug = families[0]!.slug;
});

Given('a plant exists', async function (this: CucumberWorld) {
  const plants = await plantSeeder.createMany(2, {
    'identity.family': this.familyId
  });

  this.plantId = plants[0]!.id;
});

Given('multiple plants exists', async function (this: CucumberWorld) {
  const plants = await plantSeeder.createMany(2, {
    'identity.family': this.familyId
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

Given('the bed has a plant', async function (this: CucumberWorld) {
  const bedId = this.bedId;
  if (bedId === undefined) {
    assert.fail('bedId not set');
  }

  const filter = { _id: toMongoId(bedId) };
  const bed = await rawCollection('beds').findOne(filter);
  if (bed === null) {
    assert.fail(`Bed ${bedId} not found`);
  }

  const plantInstances: unknown[] = Array.isArray(bed.plantInstances)
    ? (bed.plantInstances as unknown[])
    : [];

  await rawCollection('beds').updateOne(filter, {
    $set: {
      plantInstances: [
        ...plantInstances,
        PlantInstanceMother.create().toPrimitives()
      ]
    }
  });
});

Given('a bed exists for another user', async function () {
  const token = getAuthToken(this, anotherUserBearerToken!);

  const localBedSeeder = BedSeeder(httpServer, token!);

  const bed = await localBedSeeder.createOne();

  this.bedId = bed.id;
});

Given(
  'a soft-deleted bed exists for the current user',
  async function (this: CucumberWorld) {
    const token = getAuthToken(this, validUserBearerToken!);
    const localBedSeeder = BedSeeder(httpServer, token!);
    const bed = await localBedSeeder.createOne({});
    const bedIdStr = bed.id.toString();

    this.storedDocument = await softDeleteDocument('beds', bedIdStr, {
      deleted: true,
      deletedAt: new Date().toISOString()
    });
    this.bedId = bedIdStr;
  }
);

Given('a soft-deleted plant exists', async function (this: CucumberWorld) {
  const plants = await plantSeeder.createMany(1, {
    'identity.family': this.familyId
  });

  const plantIdStr = plants[0]!.id.toString();

  this.storedDocument = await softDeleteDocument('plants', plantIdStr, {
    status: PlantStatus.DELETED,
    deletedAt: new Date().toISOString()
  });
  this.plantId = plantIdStr;
});

Given(
  'the logged-in user is removed from storage',
  async function (this: CucumberWorld) {
    const db = client.db();
    const usersCollection = db.collection('users');

    if (!this.token || !this.loggedInEmail) {
      throw new Error('No logged-in user in the current scenario');
    }

    const usersResult = await usersCollection.deleteOne({
      email: this.loggedInEmail
    });

    if (usersResult.deletedCount === 0) {
      throw new Error(`Logged-in user not found: ${this.loggedInEmail}`);
    }
  }
);

Given('I use If-Match {string}', function (this: CucumberWorld, value: string) {
  this.ifMatch = interpolateRoute(value, this);
});

Given(
  'I use If-None-Match {string}',
  function (this: CucumberWorld, value: string) {
    this.ifNoneMatch = interpolateRoute(value, this);
  }
);

Given(
  'I record the current {resource}',
  async function (this: CucumberWorld, resource: Resource) {
    const { collection, idKey } = RESOURCES[resource];

    await recordDocument(this, collection, this[idKey]);
  }
);

Given(
  'the {resource} is stored at version {int}',
  async function (this: CucumberWorld, resource: Resource, version: number) {
    const { collection, idKey } = RESOURCES[resource];
    const id = this[idKey];
    if (typeof id !== 'string') {
      assert.fail(`${resource} id not set`);
    }

    const result = await rawCollection(collection).updateOne(
      { _id: toMongoId(id) },
      { $set: { version } }
    );
    assert.strictEqual(result.matchedCount, 1, `${resource} ${id} not found`);

    await recordDocument(this, collection, id);
  }
);

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
      ifNoneMatch: this.ifNoneMatch,
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
      ifNoneMatch: this.ifNoneMatch,
      ...withToken(token)
    });
  }
);

When(
  'I send a GET collaborator request to {string}',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'GET', normalizedRoute);

    const token = getAuthToken(this, validCollaboratorBearerToken!);

    this.request = buildRequest({
      method: 'get',
      route: normalizedRoute,
      ifNoneMatch: this.ifNoneMatch,
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

When(
  'I send a GET request to {string} with query:',
  async function (this: CucumberWorld, route: string, docString: string) {
    this.request = buildGetRequestWithQuery.call(this, route, docString);
  }
);

When(
  'I send a GET user request to {string} with query:',
  async function (this: CucumberWorld, route: string, docString: string) {
    this.request = buildGetRequestWithQuery.call(
      this,
      route,
      docString,
      getAuthToken(this, validUserBearerToken!)
    );
  }
);

When(
  'I send a GET admin request to {string} with query:',
  async function (this: CucumberWorld, route: string, docString: string) {
    this.request = buildGetRequestWithQuery.call(
      this,
      route,
      docString,
      getAuthToken(this, validAdminBearerToken!)
    );
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
      ifMatch: this.ifMatch,
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
      ifMatch: this.ifMatch,
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
      ifMatch: this.ifMatch,
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
      ifMatch: this.ifMatch,
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
      ifMatch: this.ifMatch,
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
      route: normalizedRoute,
      ifMatch: this.ifMatch
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

for (const role of ['user', 'admin'] as const) {
  When(
    `I send {int} concurrent PATCH ${role} requests to {string} with body`,
    async function (
      this: CucumberWorld,
      count: number,
      route: string,
      body: string
    ) {
      const normalizedRoute = interpolateRoute(route, this);
      const payload = parseBody(body, this);

      setRequestContext(this, 'PATCH', normalizedRoute);

      await sendConcurrently(this, count, () =>
        buildRequest({
          method: 'patch',
          route: normalizedRoute,
          ifMatch: this.ifMatch,
          ...withToken(getAuthToken(this, tokenFor(role))),
          body: payload
        })
      );
    }
  );

  When(
    `I send {int} concurrent DELETE ${role} requests to {string}`,
    async function (this: CucumberWorld, count: number, route: string) {
      const normalizedRoute = interpolateRoute(route, this);

      setRequestContext(this, 'DELETE', normalizedRoute);

      await sendConcurrently(this, count, () =>
        buildRequest({
          method: 'delete',
          route: normalizedRoute,
          ifMatch: this.ifMatch,
          ...withToken(getAuthToken(this, tokenFor(role)))
        })
      );
    }
  );
}

When(
  'I send a GET request to {string} from origin {string}',
  async function (this: CucumberWorld, route: string, origin: string) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'GET', normalizedRoute);

    this.request = buildRequest({ method: 'get', route: normalizedRoute }).set(
      'Origin',
      origin
    );
  }
);

When(
  'I send a CORS preflight for {word} {string} from origin {string} requesting headers {string}',
  async function (
    this: CucumberWorld,
    method: string,
    route: string,
    origin: string,
    headers: string
  ) {
    const normalizedRoute = interpolateRoute(route, this);

    setRequestContext(this, 'OPTIONS', normalizedRoute);

    this.request = request(httpServer)
      .options(normalizedRoute)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', method)
      .set('Access-Control-Request-Headers', headers);
  }
);

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
  'the response body should contain a paginated list',
  async function (this: CucumberWorld) {
    const response = (await this.request!) as {
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
  async function (this: CucumberWorld, count: number) {
    const response = (await this.request!) as {
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

Then('the list should be empty', async function (this: CucumberWorld) {
  const response = (await this.request!) as {
    body: { data: unknown[] };
  };

  assert.isArray(response.body.data);
  assert.lengthOf(response.body.data, 0);
});

type MatchRow = {
  field: string;
  operator: keyof typeof operators;
  value: string;
};

function getResponseData(world: CucumberWorld): unknown[] {
  const body = world.responseRaw?.body as { data?: unknown[] } | undefined;

  assert.exists(body);
  assert.isArray(body.data);

  return body.data as unknown[];
}

Then(
  'every item should match:',
  function (this: CucumberWorld, dataTable: DataTable) {
    const rows: MatchRow[] = dataTable.hashes().map((row) => ({
      field: interpolateRoute(row.field as string, this),
      operator: row.operator as keyof typeof operators,
      value: interpolateRoute(row.value as string, this)
    }));

    const items = getResponseData(this);

    for (const item of items) {
      for (const row of rows) {
        assertField(item, row.field, row.operator, row.value);
      }
    }
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
  'the response body should not contain',
  async function (this: CucumberWorld, docString: string) {
    const response = await this.request!;

    const expected = parseJsonObject(
      interpolateJson(docString, this)
    ) as Record<string, unknown>;

    assert.isDefined(response.body, 'Response body is undefined');

    const hasMatch = compareResponseObject(response.body, expected);

    assert.isFalse(
      hasMatch,
      `Expected response NOT to contain: ${JSON.stringify(expected)}`
    );
  }
);

Then(
  'GET {string} returns 404',
  async function (this: CucumberWorld, route: string) {
    const normalizedRoute = interpolateRoute(route, this);

    await request(httpServer).get(normalizedRoute).expect(404);
  }
);

Then('the bed should be unchanged', async function (this: CucumberWorld) {
  await assertDocumentUnchanged(this, 'beds', this.bedId);
});

Then('the plant should be unchanged', async function (this: CucumberWorld) {
  await assertDocumentUnchanged(this, 'plants', this.plantId);
});

Then(
  'exactly {int} response(s) should have status {int} and the rest {int}',
  function (
    this: CucumberWorld,
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
  function (this: CucumberWorld, expected: string) {
    assert.strictEqual(
      this.responseRaw!.headers.etag,
      interpolateRoute(expected, this)
    );
  }
);

Then(
  'the response ETag should match the body version',
  function (this: CucumberWorld) {
    const { version } = this.responseRaw!.body as { version?: unknown };

    if (typeof version !== 'number') {
      assert.fail('Response body has no numeric version');
    }

    assert.strictEqual(this.responseRaw!.headers.etag, `"${version}"`);
  }
);

Then(
  'the response header {string} should include {string}',
  function (this: CucumberWorld, header: string, expected: string) {
    const value = toHeaderRecord(this.responseRaw!.headers)[
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

Then('the response should not have an ETag', function (this: CucumberWorld) {
  assert.notProperty(this.responseRaw!.headers, 'etag');
});

Then(
  'a GET user request to {string} should return a body containing',
  async function (this: CucumberWorld, route: string, docString: string) {
    const response = await buildRequest({
      method: 'get',
      route: interpolateRoute(route, this),
      ...withToken(getAuthToken(this, validUserBearerToken!))
    }).expect(200);

    const expected = parseJsonObject(
      interpolateJson(docString, this)
    ) as Record<string, unknown>;

    assert.isTrue(
      compareResponseObject(response.body, expected),
      `Expected ${JSON.stringify(response.body)} to contain ${JSON.stringify(expected)}`
    );
  }
);

Then('the family should be unchanged', async function (this: CucumberWorld) {
  await assertDocumentUnchanged(this, 'families', this.familyId);
});

Then(
  'the response errors should include {string}',
  function (this: CucumberWorld, key: string) {
    const body = this.responseRaw!.body as { errors?: unknown };

    assert.isObject(body.errors, 'Response body has no errors object');
    assert.property(body.errors, key);
  }
);

Then(
  'a GET {role} request to {string} should return status {int}',
  async function (
    this: CucumberWorld,
    role: 'user' | 'admin',
    route: string,
    status: number
  ) {
    await buildRequest({
      method: 'get',
      route: interpolateRoute(route, this),
      ...withToken(tokenFor(role))
    }).expect(status);
  }
);

Then('response matches OpenAPI contract', async function (this: CucumberWorld) {
  const responses = this.responses ?? [this.responseRaw!];

  for (const response of responses) {
    await assertResponseMatchesOpenApi({
      specPath: openApiSpecPath(),
      path: this.route!,
      method: this.method!,
      status: this.responses ? response.status : this.status!,
      body: response.body,
      headers: toHeaderRecord(response.headers)
    });
  }
});
