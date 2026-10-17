import { Given, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { API_PREFIXES } from '../../../../../src/apps/agroApi/routes/shared/apiPrefixes.js';
import type { AuthRepository } from '../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import { prepareRequest, suite, type AgroWorld } from './utils/index.js';

const LOOKUP_ROUTE = `${API_PREFIXES.users}/lookup`;

const authRepository = (): AuthRepository =>
  suite().container.resolve<AuthRepository>('authRepository');

const store = async (roles: string[]): Promise<void> => {
  const user = UserMother.create({
    roles: new UserRoles(roles),
    emailValidated: true
  });
  const outcome = await authRepository().create(user);
  assert.strictEqual(
    outcome,
    'created',
    `Could not seed the account ${user.email.value}`
  );
};

const seedTarget = async (world: AgroWorld, roles: string[]): Promise<void> => {
  const user = UserMother.create({
    roles: new UserRoles(roles),
    emailValidated: true
  });
  const outcome = await authRepository().create(user);
  assert.strictEqual(
    outcome,
    'created',
    `Could not seed the target account ${user.email.value}`
  );
  world.userId = user.id;
  world.targetEmail = user.email.value;
  world.targetUsername = user.username.value;
};

const lookup = (
  world: AgroWorld,
  query: string,
  role?: 'admin' | 'user'
): void => {
  prepareRequest(world, {
    method: 'GET',
    route: LOOKUP_ROUTE,
    ...(role === undefined ? {} : { role }),
    query
  });
};

Given('a user-only account exists', async function (this: AgroWorld) {
  await seedTarget(this, ['user']);
});

Given(
  'an administrator account exists as the only administrator',
  async function (this: AgroWorld) {
    await seedTarget(this, ['user', 'admin']);
  }
);

Given(
  'an administrator account exists alongside another administrator',
  async function (this: AgroWorld) {
    await seedTarget(this, ['user', 'admin']);
    await store(['user', 'admin']);
  }
);

When(
  'I look up the account by its email as an administrator',
  function (this: AgroWorld) {
    assert.exists(this.targetEmail, 'No seeded account in this scenario');
    lookup(
      this,
      `email=${encodeURIComponent(this.targetEmail ?? '')}`,
      'admin'
    );
  }
);

When(
  'I look up the account by its username as an administrator',
  function (this: AgroWorld) {
    assert.exists(this.targetUsername, 'No seeded account in this scenario');
    lookup(
      this,
      `username=${encodeURIComponent(this.targetUsername ?? '')}`,
      'admin'
    );
  }
);

When(
  'I look up by email and username as an administrator',
  function (this: AgroWorld) {
    lookup(
      this,
      `email=${encodeURIComponent(
        this.targetEmail ?? 'someone@example.com'
      )}&username=${encodeURIComponent(this.targetUsername ?? 'someone')}`,
      'admin'
    );
  }
);

When(
  'I look up a value no account holds as an administrator',
  function (this: AgroWorld) {
    lookup(this, 'email=nobody@example.com', 'admin');
  }
);
