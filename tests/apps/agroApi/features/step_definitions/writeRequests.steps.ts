import { Given, When } from '@cucumber/cucumber';

import { prepareRequest, type AgroWorld, type Role } from './utils/index.js';

Given(
  'a POST request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, body });
  }
);

Given(
  'a POST request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, { method: 'POST', route, query, body });
  }
);

Given(
  'a POST admin request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, {
      method: 'POST',
      route,
      role: 'admin',
      query,
      body
    });
  }
);

Given(
  'a POST {role} request to {string} with body',
  function (this: AgroWorld, role: Role, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, role, body });
  }
);

Given(
  'a POST user request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, {
      method: 'POST',
      route,
      role: 'user',
      query,
      body
    });
  }
);

When(
  'I send a PATCH admin request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role: 'admin',
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH admin request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role: 'admin',
      query,
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH user request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role: 'user',
      query,
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH user request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role: 'user',
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'PATCH', route, body, conditional: true });
  }
);

When(
  'I send a DELETE admin request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, {
      method: 'DELETE',
      route,
      role: 'admin',
      conditional: true
    });
  }
);

When(
  'I send a DELETE user request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, {
      method: 'DELETE',
      route,
      role: 'user',
      conditional: true
    });
  }
);

When(
  'I send a DELETE request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, { method: 'DELETE', route, conditional: true });
  }
);
