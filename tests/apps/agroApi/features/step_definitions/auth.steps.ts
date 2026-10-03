import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';

import {
  buildRequest,
  currentResponse,
  parseJsonObject,
  suite,
  type AgroWorld
} from './utils/index.js';

Given(
  'an authentication with body',
  async function (this: AgroWorld, docString: string) {
    const payload = parseJsonObject(docString);

    if (Array.isArray(payload) || typeof payload.email !== 'string') {
      throw new TypeError('Authentication body must include an email');
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

    // A failed login must stop the scenario, not leave it without a user.
    const { token } = response.body;
    if (typeof token !== 'string') {
      assert.fail(
        `Login failed for ${payload.email}: no token in the response`
      );
    }

    // Scenario state only: the start-up tokens in suite() stay untouched.
    this.loggedInToken = token;
    this.loggedInEmail = payload.email;
  }
);

Given(
  'the logged-in user is removed from storage',
  async function (this: AgroWorld) {
    const usersCollection = suite().client.db().collection('users');

    if (!this.loggedInToken || !this.loggedInEmail) {
      throw new TypeError('No logged-in user in the current scenario');
    }

    const usersResult = await usersCollection.deleteOne({
      email: this.loggedInEmail
    });

    if (usersResult.deletedCount === 0) {
      throw new TypeError(`Logged-in user not found: ${this.loggedInEmail}`);
    }
  }
);

Then(
  'the response body should include an auth token',
  async function (this: AgroWorld) {
    const body = (await currentResponse(this)).body as {
      token?: string;
    };

    assert.isNotEmpty(body.token);
  }
);
