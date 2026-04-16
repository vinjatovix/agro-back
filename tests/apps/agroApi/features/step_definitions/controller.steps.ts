import { AfterAll, BeforeAll, Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import request from 'supertest';
import { createAppContainer } from '../../../../../src/apps/backend/container.js';
import { EnvironmentArranger } from '../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { AgroBackApp } from '../../../../../src/apps/backend/AgroBackApp.js';
import type { Server } from 'http';

const container = createAppContainer();

const ENVIRONMENT_ARRANGER: Promise<EnvironmentArranger> = Promise.resolve(
  container.resolve<EnvironmentArranger>('environmentArranger')
);

let _request: request.Test;
let _response: request.Response;
let app: AgroBackApp;
let httpServer: Server;

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
              (responseObj[key as keyof T] as Record<string, unknown>)[
                typedSubKey
              ] === subValue
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
  app = new AgroBackApp();
  await app.start(container.resolve('logger'));
  if (!app.httpServer) {
    throw new Error('HTTP server is not available');
  }
  httpServer = app.httpServer;
  await (await ENVIRONMENT_ARRANGER).arrange();
});

AfterAll(async () => {
  await (await ENVIRONMENT_ARRANGER).arrange();
  await (await ENVIRONMENT_ARRANGER).close();
  await app.stop(container.resolve('logger'));
});

Given('a GET request to {string}', async (route: string) => {
  _request = request(httpServer).get(route);
});

Then('the response status code should be {int}', async (status: number) => {
  _response = await _request.expect(status);
});

Then('the response body should be', async (docString: string) => {
  assert.deepStrictEqual(_response.body, JSON.parse(docString));
});

Then('the response body should contain', async (docString: string) => {
  const response = await _request;
  const expectedResponseBody = JSON.parse(docString);

  const matches = compareResponseObject(response.body, expectedResponseBody);

  assert.isTrue(
    matches,
    'Expected response body to match the expected response body'
  );
});
