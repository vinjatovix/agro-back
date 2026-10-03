import { When } from '@cucumber/cucumber';
import request from 'supertest';

import {
  interpolateRoute,
  prepareRequest,
  suite,
  type AgroWorld
} from './utils/index.js';

When(
  'I send a GET request to {string} from origin {string}',
  function (this: AgroWorld, route: string, origin: string) {
    this.request = prepareRequest(this, { method: 'GET', route }).set(
      'Origin',
      origin
    );
  }
);

When(
  'I send a CORS preflight for {word} {string} from origin {string} requesting headers {string}',
  function (
    this: AgroWorld,
    method: string,
    route: string,
    origin: string,
    headers: string
  ) {
    const normalizedRoute = interpolateRoute(route, this.placeholders());

    this.route = normalizedRoute;
    this.method = 'OPTIONS';

    this.request = request(suite().httpServer)
      .options(normalizedRoute)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', method)
      .set('Access-Control-Request-Headers', headers);
  }
);
