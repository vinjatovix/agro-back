import {
  AfterAll,
  Before,
  BeforeAll,
  defineParameterType,
  setWorldConstructor
} from '@cucumber/cucumber';

import {
  AgroWorld,
  startSuite,
  stopSuite,
  suite,
  type Resource,
  type Role
} from './utils/index.js';

setWorldConstructor(AgroWorld);

BeforeAll(startSuite);

Before(() => suite().environmentArranger.arrange());

AfterAll(stopSuite);

const ROLES: Readonly<Record<string, Role>> = {
  user: 'user',
  admin: 'admin',
  'logged-in': 'loggedIn'
};

defineParameterType({
  name: 'role',
  regexp: /logged-in|user|admin/,
  transformer: (value: string): Role => {
    const role = ROLES[value];
    if (!role) {
      throw new TypeError(`Unknown role "${value}"`);
    }

    return role;
  }
});

defineParameterType({
  name: 'resource',
  regexp: /bed|plant|family/,
  transformer: (value: string): Resource => {
    if (value === 'plant' || value === 'family') return value;
    return 'bed';
  }
});
