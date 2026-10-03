import { Given, When } from '@cucumber/cucumber';

import { prepareRequest, tokenFor, type AgroWorld } from './utils/index.js';

/** Query string of the `… with query:` steps: the doc string, URL-encoded. */
const queryParam = (docString: string): string =>
  `query=${encodeURIComponent(docString)}`;

/** Route segment replaced by the token of the scenario's login step. */
const LOGGED_IN_TOKEN = 'logged-in-token';

Given('a GET request to {string}', function (this: AgroWorld, route: string) {
  prepareRequest(this, {
    method: 'GET',
    route: route.includes(LOGGED_IN_TOKEN)
      ? route.replace(LOGGED_IN_TOKEN, tokenFor(this, 'loggedIn'))
      : route
  });
});

Given(
  'a GET user request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, { method: 'GET', route, role: 'user' });
  }
);

When(
  'I send a GET admin request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      role: 'admin',
      conditional: true
    });
  }
);

When(
  'I send a GET user request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      role: 'user',
      conditional: true
    });
  }
);

When(
  'I send a GET user request to {string} with body:',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'GET', route, role: 'user', body });
  }
);

When(
  'I send a GET collaborator request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      role: 'collaborator',
      conditional: true
    });
  }
);

When(
  'I send a GET request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, { method: 'GET', route });
  }
);

When(
  'I send a GET request to {string} with body:',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'GET', route, body });
  }
);

When(
  'I send a GET request to {string} with query string {string}',
  function (this: AgroWorld, route: string, query: string) {
    prepareRequest(this, { method: 'GET', route, query });
  }
);

When(
  'I send a GET request to {string} with query:',
  function (this: AgroWorld, route: string, docString: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      query: queryParam(docString)
    });
  }
);

When(
  'I send a GET user request to {string} with query:',
  function (this: AgroWorld, route: string, docString: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      role: 'user',
      query: queryParam(docString)
    });
  }
);

When(
  'I send a GET admin request to {string} with query:',
  function (this: AgroWorld, route: string, docString: string) {
    prepareRequest(this, {
      method: 'GET',
      route,
      role: 'admin',
      query: queryParam(docString)
    });
  }
);
