import { AfterAll, BeforeAll, Given, Then } from '@cucumber/cucumber';
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
import type { UnknownRecord } from '../../../../../src/shared/domain/types/UnknownRecord.js';
import type { PlantPrimitives } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';

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

// const sendPostRequest = async (
//   endpoint: string,
//   payload: ApplicationPostRequest
// ) => {
//   _request = request(httpServer)
//     .post(endpoint)
//     .set('Authorization', `Bearer ${validAdminBearerToken}`)
//     .send(payload as object);
//   await _request.expect(201);
// };

const compareResponseObject = <T>(
  responseObj: T,
  expectedObj: Partial<T>
): boolean => {
  return Object.entries(expectedObj).every(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(responseObj, key)) {
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value).every(
          ([subKey, subValue]: [string, unknown]) => {
            const typedSubKey = subKey as keyof typeof value;
            return (
              (responseObj[key as keyof T] as UnknownRecord)[typedSubKey] ===
              subValue
            );
          }
        );
      } else {
        return responseObj[key as keyof T] === value;
      }
    } else {
      return false;
    }
  });
};

BeforeAll(async () => {
  app = new AgroBackApp({
    host: process.env.HOST || 'http://localhost',
    port: process.env.PORT || '0'
  });
  await app.start(container.resolve('logger'));
  if (!app.httpServer) {
    throw new Error('HTTP server is not available');
  }
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
});

AfterAll(async () => {
  await (await ENVIRONMENT_ARRANGER).arrange();
  await (await ENVIRONMENT_ARRANGER).close();
  await app.stop(container.resolve('logger'));
});

Given('a GET request to {string}', async (route: string) => {
  const normalizedRoute = route.includes('current-user-token')
    ? route.replace('current-user-token', validUserBearerToken ?? '')
    : route;

  _request = request(httpServer).get(normalizedRoute);
});

Given(
  'a POST request to {string} with body',
  async (route: string, body: string) => {
    _request = request(httpServer).post(route).send(JSON.parse(body));
  }
);

Given('an authentication with body', async (docString: string) => {
  const payload = JSON.parse(docString);
  _request = request(httpServer)
    .post(API_PREFIXES.auth + '/login')
    .send(payload);

  const response = await _request;
  validUserBearerToken = response.body.token;
});

Given(
  'a POST admin request to {string} with body',
  async (route: string, body: string) => {
    _request = request(httpServer)
      .post(route)
      .set('Authorization', `Bearer ${validAdminBearerToken}`)
      .send(JSON.parse(body));
  }
);

Given(
  'a POST user request to {string} with body',
  async (route: string, body: string) => {
    _request = request(httpServer)
      .post(route)
      .set('Authorization', `Bearer ${validUserBearerToken}`)
      .send(JSON.parse(body));
  }
);

Then('the response status code should be {int}', async (status: number) => {
  _response = await _request.expect(status);
});

Then('the response body should be empty', async () => {
  assert.isEmpty(_response.body);
});

Then('the response body should include an auth token', async () => {
  assert.isNotEmpty(_response.body.token);
});

Then('the response body should be', async (docString: string) => {
  assert.deepStrictEqual(_response.body, JSON.parse(docString));
});

Then('the response body should contain', async (docString: string) => {
  const response = await _request;
  const expectedResponseBody: Partial<PlantPrimitives> = JSON.parse(docString);

  const matches = compareResponseObject(response.body, expectedResponseBody);

  assert.isTrue(
    matches,
    'Expected response body to match the expected response body'
  );
});
