import path from 'node:path';
import { Lifetime } from 'awilix';
import { MongoClient } from 'mongodb';

import {
  EXPLICIT_NAMES,
  getCradlePropertyNames
} from '../../../scripts/wiringIntrospection.js';
import { createAppContainer } from '../../../src/apps/agroApi/container.js';
import {
  COMPONENT_ROLES,
  toRegistrationName
} from '../../../src/apps/agroApi/wiring/componentRoles.js';
import { scanComponents } from '../../../src/apps/agroApi/wiring/scanComponents.js';
import { SOURCE_ROOT } from '../../shared/sourceRoot.js';

describe('container wiring', () => {
  it('registers every discovered component plus the explicit registrations', async () => {
    const client = new MongoClient('mongodb://localhost:27017');
    const db = client.db('test');
    const container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });
    const components = await scanComponents(SOURCE_ROOT, COMPONENT_ROLES);
    const expectedKeys = [
      ...components.map((component) => component.registrationName),
      ...EXPLICIT_NAMES
    ].sort();

    const registeredKeys = Object.keys(container.registrations).sort();

    expect(registeredKeys).toEqual(expectedKeys);
  });

  it('matches all registration names with ContainerCradle type properties', async () => {
    const client = new MongoClient('mongodb://localhost:27017');
    const db = client.db('test');
    const container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });

    const cradlePath = path.resolve(
      SOURCE_ROOT,
      'apps/agroApi/wiring/ContainerCradle.ts'
    );
    const cradleProperties = getCradlePropertyNames(cradlePath).sort();
    const registeredKeys = Object.keys(container.registrations).sort();

    expect(registeredKeys).toEqual(cradleProperties);
  });

  it('resolves every singleton from root and every scoped from scope without errors', async () => {
    const client = new MongoClient('mongodb://localhost:27017');
    const db = client.db('test');
    const container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });
    const scope = container.createScope();

    const resolutionFailures: Array<{ name: string; error: string }> = [];

    for (const [name, registration] of Object.entries(
      container.registrations
    )) {
      try {
        if (registration.lifetime === Lifetime.SINGLETON) {
          container.resolve(name);
        } else {
          scope.resolve(name);
        }
      } catch (error) {
        resolutionFailures.push({
          name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    expect(resolutionFailures).toEqual([]);
  });

  it('adheres to naming conventions for all discovered components', async () => {
    const client = new MongoClient('mongodb://localhost:27017');
    const db = client.db('test');
    const container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });
    const components = await scanComponents(SOURCE_ROOT, COMPONENT_ROLES);

    for (const component of components) {
      if (EXPLICIT_NAMES.has(component.registrationName)) {
        continue;
      }

      const expectedName = toRegistrationName(component.className);
      expect(component.registrationName).toBe(expectedName);
      expect(container.registrations[expectedName]).toBeDefined();
    }
  });
});
