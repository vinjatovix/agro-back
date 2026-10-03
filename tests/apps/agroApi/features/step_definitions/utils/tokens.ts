import { assert } from 'chai';

import { suite, type SuiteRole } from './suite.js';
import type { AgroWorld } from './world.js';

/** `loggedIn` is the user the scenario's login step authenticated. */
export type Role = 'user' | 'admin' | 'loggedIn';

/**
 * Token a step sends: the login step's for `loggedIn`, else the role's
 * start-up token. A login never stands in for another role.
 */
export const tokenFor = (world: AgroWorld, role: Role | SuiteRole): string => {
  if (role === 'loggedIn') {
    assert.exists(
      world.loggedInToken,
      'No logged-in user in this scenario: run the authentication step first'
    );

    return world.loggedInToken;
  }

  return suite().tokens[role];
};

/** Username carried by the token a role currently sends. */
export const usernameFor = (world: AgroWorld, role: Role): string => {
  const payload = tokenFor(world, role).split('.')[1];
  if (!payload) {
    assert.fail(`No ${role} token available`);
  }

  const { username } = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8')
  ) as { username?: unknown };
  if (typeof username !== 'string') {
    assert.fail(`The ${role} token carries no username`);
  }

  return username;
};
