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
import { Uuid } from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import type { EncrypterTool } from '../../../../../src/Contexts/shared/plugins/index.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { PlantSeeder } from '../shared/seeders/PlantSeeder.js';

export interface TestWorld {
  plantId?: string;
  bedId?: string;
  token?: string;
}

class TestWorldImpl extends World implements TestWorld {
  plantId?: string;
  bedId?: string;
  token?: string;
}

setWorldConstructor(TestWorldImpl);

const container = createAppContainer();

const ENVIRONMENT_ARRANGER: Promise<EnvironmentArranger> = Promise.resolve(
  container.resolve<EnvironmentArranger>('environmentArranger')
);

const ENCRYPTER: EncrypterTool = container.resolve<EncrypterTool>('encrypter');

let _request: request.Test;
let _response: request.Response;
let app: AgroBackApp;
let httpServer: Server;
let validAdminBearerToken: Nullable<string>;
let validUserBearerToken: Nullable<string>;
let plantSeeder: ReturnType<typeof PlantSeeder>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const compareResponseObject = <T extends Record<string, unknown>>(
  responseObj: T,
  expectedObj: Partial<T>
): boolean => {
  const compare = (actual: unknown, expected: unknown): boolean => {
    if (expected === undefined) return true;

    if (expected === null) return actual === null;

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      return expected.every((v, i) => compare(actual[i], v));
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
    id: Uuid.random().value,
    email: 'admin@tsapi.com',
    username: UserMother.random().username.value,
    roles: ['admin']
  });

  validUserBearerToken = await ENCRYPTER.generateToken({
    id: Uuid.random().value,
    email: 'user@tsapi.com',
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

Given('a GET request to {string}', async function (route: string) {
  const normalizedRoute = route.includes('current-user-token')
    ? route.replace('current-user-token', validUserBearerToken ?? '')
    : route;

  _request = request(httpServer).get(normalizedRoute);
});

Given(
  'a POST request to {string} with body',
  async function (route: string, body: string) {
    _request = request(httpServer).post(route).send(JSON.parse(body));
  }
);

Given('an authentication with body', async function (docString: string) {
  const payload = JSON.parse(docString);

  _request = request(httpServer)
    .post(API_PREFIXES.auth + '/login')
    .send(payload);

  const response = await _request;

  validUserBearerToken = response.body.token;
  this.token = validUserBearerToken ?? undefined;
});

Given(
  'a POST admin request to {string} with body',
  async function (route: string, body: string) {
    _request = request(httpServer)
      .post(route)
      .set('Authorization', `Bearer ${validAdminBearerToken}`)
      .send(JSON.parse(body));
  }
);

Given(
  'a POST user request to {string} with body',
  async function (route: string, body: string) {
    _request = request(httpServer)
      .post(route)
      .set('Authorization', `Bearer ${validUserBearerToken}`)
      .send(JSON.parse(body));
  }
);

Given('a plant exists', async function () {
  const plant = await plantSeeder.create();
  this.plantId = plant.id;
});

When('I get the plant', async function () {
  if (!this.plantId) throw new Error('plantId not set');

  _request = request(httpServer).get(`/api/v1/plants/${this.plantId}`);
});

Then(
  'the response status code should be {int}',
  async function (status: number) {
    _response = await _request.expect(status);
  }
);

Then('the response body should be empty', async function () {
  assert.isEmpty(_response.body);
});

Then('the response body should include an auth token', async function () {
  assert.isNotEmpty(_response.body.token);
});

Then('the response body should be', async function (docString: string) {
  assert.deepStrictEqual(_response.body, JSON.parse(docString));
});

Then('the response body should contain', async function (docString: string) {
  const response = await _request;

  const expected = JSON.parse(docString) as Partial<PlantPrimitives>;

  if (expected.id === '<plantId>') {
    expected.id = this.plantId!;
  }

  const matches = compareResponseObject(response.body, expected);

  assert.isTrue(matches, 'Expected response body to match expected');
});
