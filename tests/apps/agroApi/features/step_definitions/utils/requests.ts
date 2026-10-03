import { assert } from 'chai';
import request from 'supertest';

import { interpolateJson, interpolateRoute } from './interpolate.js';
import { parseJsonObject } from './parseJsonObject.js';
import { suite, type SuiteRole } from './suite.js';
import { tokenFor, type Role } from './tokens.js';
import type { AgroWorld, HttpMethod } from './world.js';

type RequestMethod = Exclude<HttpMethod, 'OPTIONS'>;

export interface RequestOptions {
  method: Lowercase<RequestMethod>;
  route: string;
  token?: string;
  body?: unknown;
  ifMatch?: string;
  ifNoneMatch?: string;
}

export interface PrepareRequestOptions {
  method: RequestMethod;
  /** Raw route, with `<placeholders>`. */
  route: string;
  /** Omitted → anonymous request. */
  role?: Role | SuiteRole;
  /** Raw query string, appended after interpolation. */
  query?: string;
  /** Raw JSON doc string, interpolated and parsed. */
  body?: string;
  /** Send the scenario's If-None-Match (GET) or If-Match (other methods). */
  conditional?: boolean;
}

const VERBS: Readonly<Record<RequestMethod, Lowercase<RequestMethod>>> = {
  GET: 'get',
  POST: 'post',
  PATCH: 'patch',
  DELETE: 'delete'
};

export const buildRequest = ({
  method,
  route,
  token,
  body,
  ifMatch,
  ifNoneMatch
}: RequestOptions): request.Test => {
  let req = request(suite().httpServer)[method](route);

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

export const parseBody = (
  body: string,
  world: AgroWorld
): Record<string, unknown> => {
  const parsed = parseJsonObject(interpolateJson(body, world.placeholders()));

  if (Array.isArray(parsed)) {
    throw new TypeError('Expected object but received array in request body');
  }

  return parsed;
};

const conditionalHeaders = (
  world: AgroWorld,
  method: RequestMethod
): Pick<RequestOptions, 'ifMatch' | 'ifNoneMatch'> => {
  if (method === 'GET') {
    return world.ifNoneMatch === undefined
      ? {}
      : { ifNoneMatch: world.ifNoneMatch };
  }

  return world.ifMatch === undefined ? {} : { ifMatch: world.ifMatch };
};

/** Records the request context on the World and returns the builder options. */
const toRequestOptions = (
  world: AgroWorld,
  { method, route, role, query, body, conditional }: PrepareRequestOptions
): RequestOptions => {
  const path = interpolateRoute(route, world.placeholders());

  // The OpenAPI check looks the path up without the query string.
  world.route = path;
  world.method = method;

  return {
    method: VERBS[method],
    route: query === undefined ? path : `${path}?${query}`,
    ...(role === undefined ? {} : { token: tokenFor(world, role) }),
    ...(body === undefined ? {} : { body: parseBody(body, world) }),
    ...(conditional ? conditionalHeaders(world, method) : {})
  };
};

export const prepareRequest = (
  world: AgroWorld,
  options: PrepareRequestOptions
): request.Test => {
  world.request = buildRequest(toRequestOptions(world, options));

  return world.request;
};

/** Sends the same request `count` times at once; responses go to the World. */
export const sendConcurrently = async (
  world: AgroWorld,
  count: number,
  options: PrepareRequestOptions
): Promise<void> => {
  const requestOptions = toRequestOptions(world, options);

  world.responses = await Promise.all(
    Array.from({ length: count }, () => buildRequest(requestOptions))
  );
};

/** Response to the scenario's request; supertest resolves it only once. */
export const currentResponse = async (
  world: AgroWorld
): Promise<request.Response> => {
  assert.exists(world.request, 'No request was sent in this scenario');

  return world.request;
};
