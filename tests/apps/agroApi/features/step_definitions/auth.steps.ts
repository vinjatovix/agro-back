import { Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { envs } from '../../../../../src/apps/agroApi/config/plugins/envs.plugin.js';
import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';
import type { EmailMessage } from '../../../../../src/Contexts/shared/application/mailer/index.js';
import type { EncrypterTool } from '../../../../../src/Contexts/shared/plugins/index.js';

import type {
  SeededUser,
  SeededUserState,
  UserSeedOptions
} from '../shared/seeders/index.js';
import {
  buildRequest,
  currentResponse,
  parseJsonObject,
  prepareRequest,
  rawCollection,
  settledMailbox,
  suite,
  type AgroWorld
} from './utils/index.js';

const ACTIVATE_ROUTE = `${API_PREFIXES.auth}/activate`;
const LOGIN_ROUTE = `${API_PREFIXES.auth}/login`;
const TOKEN_IN_LINK = /\/activate#token=([A-Za-z0-9_%-]+)/;
const TOKEN_HASH = /^[0-9a-f]{64}$/;

const seedAccount = async (
  world: AgroWorld,
  state: SeededUserState,
  options: UserSeedOptions
): Promise<SeededUser> => {
  const seeded = await suite().seeders.user.create({ ...options, state });

  world.seededUsers.set(seeded.email, seeded);
  if (seeded.activationToken !== undefined) {
    world.activationToken = seeded.activationToken;
  }

  return seeded;
};

const seededUser = (world: AgroWorld, email: string): SeededUser => {
  const seeded = world.seededUsers.get(email);
  if (!seeded) {
    assert.fail(`No account was seeded with email ${email}`);
  }

  return seeded;
};

const storedUser = async (email: string): Promise<Record<string, unknown>> => {
  const user = await rawCollection('users').findOne({ email });
  if (!user) {
    assert.fail(`No user stored with email ${email}`);
  }

  return user;
};

const emailsTo = async (address: string): Promise<EmailMessage[]> =>
  (await settledMailbox())
    .sentMessages()
    .filter((message) => message.to.value === address);

const lastEmailTo = async (address: string): Promise<EmailMessage> => {
  const last = (await emailsTo(address)).at(-1);
  if (!last) {
    assert.fail(`No email was sent to ${address}`);
  }

  return last;
};

const tokenInLastEmailTo = async (address: string): Promise<string> => {
  const match = TOKEN_IN_LINK.exec((await lastEmailTo(address)).text);
  if (!match?.[1]) {
    assert.fail(`The last email to ${address} has no activation link`);
  }

  return decodeURIComponent(match[1]);
};

const postActivationToken = (world: AgroWorld, token: unknown): void => {
  prepareRequest(world, {
    method: 'POST',
    route: ACTIVATE_ROUTE,
    body: JSON.stringify({ token })
  });
};

const scenarioActivationToken = (world: AgroWorld): string => {
  assert.exists(
    world.activationToken,
    'No activation token in this scenario: seed a pending account first'
  );

  return world.activationToken;
};

const loginStatus = async (email: string, password: string): Promise<number> =>
  (
    await buildRequest({
      method: 'post',
      route: LOGIN_ROUTE,
      body: { email, password }
    })
  ).status;

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

Given(
  'a user exists with username {string}',
  async function (this: AgroWorld, username: string) {
    await suite().seeders.user.create({ username });
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

Given(
  'a pending account exists with email {string}',
  async function (this: AgroWorld, email: string) {
    await seedAccount(this, 'pending', { email });
  }
);

Given(
  'a pending account with an expired activation token exists with email {string}',
  async function (this: AgroWorld, email: string) {
    await seedAccount(this, 'pendingExpired', { email });
  }
);

Given(
  'a pending account with an expired activation token exists with email {string}, id {string} and username {string}',
  async function (
    this: AgroWorld,
    email: string,
    id: string,
    username: string
  ) {
    await seedAccount(this, 'pendingExpired', { email, id, username });
  }
);

Given(
  'a pending account without activation token exists with email {string}, id {string} and username {string}',
  async function (
    this: AgroWorld,
    email: string,
    id: string,
    username: string
  ) {
    await seedAccount(this, 'pendingWithoutToken', { email, id, username });
  }
);

Given(
  'an active account exists with email {string}',
  async function (this: AgroWorld, email: string) {
    await seedAccount(this, 'active', { email });
  }
);

Given(
  'an active account exists with email {string} and password {string}',
  async function (this: AgroWorld, email: string, password: string) {
    await seedAccount(this, 'active', { email, password });
  }
);

Given(
  'a pending account exists with email {string} and password {string}',
  async function (this: AgroWorld, email: string, password: string) {
    await seedAccount(this, 'pending', { email, password });
  }
);

Given(
  'an account linked to Google identity {string} exists with email {string}',
  async function (this: AgroWorld, googleSub: string, email: string) {
    await seedAccount(this, 'googleLinked', { email, googleSub });
  }
);

Given(
  'a session token for the account {string}',
  async function (this: AgroWorld, email: string) {
    const { id, username } = seededUser(this, email);
    const token = await suite()
      .container.resolve<EncrypterTool>('encrypter')
      .generateToken({ id, email, username, roles: ['user'] });

    assert.exists(token, `Could not sign a session token for ${email}`);
    this.loggedInToken = token;
    this.loggedInEmail = email;
  }
);

Given(
  'the stored user {string} is recorded',
  async function (this: AgroWorld, email: string) {
    this.storedDocument = await storedUser(email);
  }
);

When('the activation token is posted', function (this: AgroWorld) {
  postActivationToken(this, scenarioActivationToken(this));
});

When(
  'the activation token is posted {word}',
  function (this: AgroWorld, change: string) {
    const token = scenarioActivationToken(this);
    const changed: Record<string, string> = {
      truncated: token.slice(0, -1),
      padded: `${token}A`
    };
    const value = changed[change];
    if (value === undefined) {
      throw new TypeError(`Unknown token change "${change}"`);
    }

    postActivationToken(this, value);
  }
);

When(
  'the session token is posted as activation token',
  function (this: AgroWorld) {
    assert.exists(this.loggedInToken, 'No session token in this scenario');
    postActivationToken(this, this.loggedInToken);
  }
);

Then(
  'the activation link emailed to {string} should activate the account',
  async function (this: AgroWorld, email: string) {
    const token = await tokenInLastEmailTo(email);

    const response = await buildRequest({
      method: 'post',
      route: ACTIVATE_ROUTE,
      body: { token }
    });

    assert.strictEqual(response.status, 204);
    assert.isTrue((await storedUser(email)).emailValidated);
  }
);

Then(
  '{int} email(s) should have been sent to {string}',
  async function (this: AgroWorld, count: number, address: string) {
    assert.lengthOf(await emailsTo(address), count);
  }
);

Then('no email should have been sent', async function () {
  assert.isEmpty((await settledMailbox()).sentMessages());
});

Then(
  'the last email to {string} should have subject {string}',
  async function (this: AgroWorld, address: string, subject: string) {
    assert.strictEqual((await lastEmailTo(address)).subject, subject);
  }
);

Then(
  'the last email to {string} should contain {string}',
  async function (this: AgroWorld, address: string, text: string) {
    assert.include((await lastEmailTo(address)).text, text);
  }
);

Then(
  'the last email to {string} should link to the activation page',
  async function (this: AgroWorld, address: string) {
    const message = await lastEmailTo(address);
    const token = await tokenInLastEmailTo(address);

    assert.include(
      message.text,
      `${envs.FRONTEND_BASE_URL}/activate#token=${token}`
    );
    assert.notInclude(message.subject, token);
  }
);

Then(
  'the stored user {string} should be validated',
  async function (this: AgroWorld, email: string) {
    const user = await storedUser(email);

    assert.isTrue(user.emailValidated);
    assert.notProperty(user, 'emailTokens');
  }
);

Then(
  'the stored user {string} should be pending',
  async function (this: AgroWorld, email: string) {
    assert.isFalse((await storedUser(email)).emailValidated);
  }
);

Then(
  'the stored user {string} should have no password',
  async function (this: AgroWorld, email: string) {
    const user = await storedUser(email);
    const methods = (user.authMethods ?? []) as Array<{ provider: string }>;

    assert.notProperty(user, 'password');
    assert.notProperty(user, 'emailTokens');
    assert.notInclude(
      methods.map(({ provider }) => provider),
      'local'
    );
  }
);

Then(
  'the stored user {string} should hold only an activation token hash',
  async function (this: AgroWorld, email: string) {
    const user = await storedUser(email);
    const tokens = user.emailTokens as Array<Record<string, unknown>>;
    const emailed = await tokenInLastEmailTo(email);

    assert.lengthOf(tokens, 1);
    assert.strictEqual(tokens[0]?.purpose, 'activation');
    assert.match(String(tokens[0]?.tokenHash), TOKEN_HASH);
    assert.notInclude(JSON.stringify(user), emailed);
  }
);

Then(
  'the stored user {string} should be unchanged',
  async function (this: AgroWorld, email: string) {
    assert.exists(this.storedDocument, 'No stored user was recorded');
    assert.deepEqual(await storedUser(email), this.storedDocument);
  }
);

Then(
  '{int} user(s) should be stored with email {string}',
  async function (this: AgroWorld, count: number, email: string) {
    assert.strictEqual(
      await rawCollection('users').countDocuments({ email }),
      count
    );
  }
);

Then(
  'the user seeded with email {string} should no longer be stored',
  async function (this: AgroWorld, email: string) {
    const { id, username } = seededUser(this, email);

    assert.strictEqual(
      await rawCollection('users').countDocuments({ username }),
      0,
      `The account ${id} is still stored`
    );
  }
);

Then(
  'the user seeded with email {string} should still be stored',
  async function (this: AgroWorld, email: string) {
    const { username } = seededUser(this, email);

    assert.strictEqual(
      await rawCollection('users').countDocuments({ username }),
      1
    );
  }
);

Then(
  'the account {string} should log in with password {string}',
  async function (this: AgroWorld, email: string, password: string) {
    assert.strictEqual(await loginStatus(email, password), 200);
  }
);

Then(
  'the account {string} should not log in with password {string}',
  async function (this: AgroWorld, email: string, password: string) {
    assert.strictEqual(await loginStatus(email, password), 401);
  }
);

Given(
  'an active account exists with email {string}, id {string} and username {string}',
  async function (
    this: AgroWorld,
    email: string,
    id: string,
    username: string
  ) {
    await seedAccount(this, 'active', { email, id, username });
  }
);

Given(
  'the activation token of {string} has been used',
  async function (this: AgroWorld, email: string) {
    const result = await rawCollection('users').updateOne(
      { email },
      { $set: { emailValidated: true }, $unset: { emailTokens: '' } }
    );

    assert.strictEqual(result.matchedCount, 1, `No user stored as ${email}`);
  }
);

Then(
  'the activation token seeded for {string} should be refused',
  async function (this: AgroWorld, email: string) {
    const { activationToken } = seededUser(this, email);
    assert.exists(activationToken, `No activation token seeded for ${email}`);

    const response = await buildRequest({
      method: 'post',
      route: ACTIVATE_ROUTE,
      body: { token: activationToken }
    });

    assert.strictEqual(response.status, 400);
  }
);
