import path from 'node:path';
import {
  asClass,
  AwilixResolutionError,
  createContainer,
  InjectionMode,
  Lifetime
} from 'awilix';

import { COMPONENT_ROLES } from '../../../../src/apps/agroApi/wiring/componentRoles.js';
import { ContainerWiringError } from '../../../../src/apps/agroApi/wiring/ContainerWiringError.js';
import { scanComponents } from '../../../../src/apps/agroApi/wiring/scanComponents.js';

describe('scanComponents', () => {
  const validFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/valid'
  );
  const unrecognizedFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/unrecognized'
  );
  const misplacedFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/misplaced'
  );
  const duplicateFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/duplicate'
  );
  const missingDependencyFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/missingDependency'
  );
  const lifetimeMismatchFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/lifetimeMismatch'
  );
  const extraClassFixturePath = path.resolve(
    process.cwd(),
    'tests/apps/agroApi/wiring/fixtures/extraClass'
  );

  it('finds exactly three components in valid fixture', async () => {
    const components = await scanComponents(validFixturePath, COMPONENT_ROLES);

    expect(components).toHaveLength(3);
  });

  it('registers components under their conventional registration names', async () => {
    const components = await scanComponents(validFixturePath, COMPONENT_ROLES);
    const names = components
      .map((component) => component.registrationName)
      .sort();

    expect(names).toEqual(['demoRepository', 'doThing', 'doThingController']);
  });

  it.each([
    { name: 'demoRepository', expectedLifetime: Lifetime.SINGLETON },
    { name: 'doThing', expectedLifetime: Lifetime.SCOPED },
    { name: 'doThingController', expectedLifetime: Lifetime.SCOPED }
  ])(
    'assigns $expectedLifetime lifetime to $name',
    async ({ name, expectedLifetime }) => {
      const components = await scanComponents(
        validFixturePath,
        COMPONENT_ROLES
      );
      const found = components.find((c) => c.registrationName === name);

      expect(found?.lifetime).toBe(expectedLifetime);
    }
  );

  it('ignores non-component files such as helpers, indexes, schemas, and interfaces', async () => {
    const components = await scanComponents(validFixturePath, COMPONENT_ROLES);
    const files = components.map((c) => c.file);

    expect(files.some((f) => f.includes('doHelper'))).toBe(false);
    expect(files.some((f) => f.includes('index'))).toBe(false);
    expect(files.some((f) => f.includes('requestSchemas'))).toBe(false);
    expect(files.some((f) => f.includes('interfaces'))).toBe(false);
  });

  it('returns components sorted by file path', async () => {
    const components = await scanComponents(validFixturePath, COMPONENT_ROLES);
    const files = components.map((c) => c.file);
    const sorted = [...files].sort((a, b) => a.localeCompare(b));

    expect(files).toEqual(sorted);
  });

  it('rejects when controller has a misspelled class name', async () => {
    let thrownError: unknown;
    try {
      await scanComponents(unrecognizedFixturePath, COMPONENT_ROLES);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ContainerWiringError);
    const wiringError = thrownError as ContainerWiringError;
    expect(wiringError.className).toBe('CreateDemoControler');
    expect(wiringError.file).toContain('CreateDemoControler.ts');
  });

  it('rejects when use case folder contains class ending in role suffix', async () => {
    let thrownError: unknown;
    try {
      await scanComponents(misplacedFixturePath, COMPONENT_ROLES);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ContainerWiringError);
    const wiringError = thrownError as ContainerWiringError;
    expect(wiringError.className).toBe('DemoRepository');
    expect(wiringError.file).toContain('DemoRepository.ts');
  });

  it('rejects a file that exports a class not named after the file', async () => {
    let thrownError: unknown;
    try {
      await scanComponents(extraClassFixturePath, COMPONENT_ROLES);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ContainerWiringError);
    const wiringError = thrownError as ContainerWiringError;
    expect(wiringError.className).toBe('DoThingFailedError');
    expect(wiringError.file).toContain('DoThing.ts');
  });

  it('rejects duplicate registration names across different files', async () => {
    let thrownError: unknown;
    try {
      await scanComponents(duplicateFixturePath, COMPONENT_ROLES);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ContainerWiringError);
    const wiringError = thrownError as ContainerWiringError;
    expect(wiringError.registrationName).toBe('demoRepository');
    expect(wiringError.file).toContain('MongoDemoRepository.ts');
    expect(wiringError.secondFile).toContain('MongoDemoRepository.ts');
  });

  it('fails resolution when a component has an unresolvable dependency', async () => {
    const components = await scanComponents(
      missingDependencyFixturePath,
      COMPONENT_ROLES
    );
    const container = createContainer({
      injectionMode: InjectionMode.PROXY,
      strict: true
    });
    for (const component of components) {
      container.register({
        [component.registrationName]: asClass(component.class).setLifetime(
          component.lifetime
        )
      });
    }

    expect(() => container.resolve('doMissing')).toThrow(AwilixResolutionError);
    expect(() => container.resolve('doMissing')).toThrow(/ghostRepository/);
  });

  it('fails resolution in strict mode when a singleton depends on a scoped component', async () => {
    const components = await scanComponents(
      lifetimeMismatchFixturePath,
      COMPONENT_ROLES
    );
    const container = createContainer({
      injectionMode: InjectionMode.PROXY,
      strict: true
    });
    for (const component of components) {
      container.register({
        [component.registrationName]: asClass(component.class).setLifetime(
          component.lifetime
        )
      });
    }

    expect(() => container.resolve('mismatchRepository')).toThrow();
  });
});
