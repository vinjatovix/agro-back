import path from 'node:path';

import {
  COMPONENT_ROLES,
  toRegistrationName
} from '../src/apps/agroApi/wiring/componentRoles.js';
import { scanComponents } from '../src/apps/agroApi/wiring/scanComponents.js';
import {
  EXPLICIT_NAMES,
  getCradlePropertyNames
} from './wiringIntrospection.js';

const sourceRoot = path.resolve(process.cwd(), 'src');
const cradlePath = path.resolve(
  sourceRoot,
  'apps/agroApi/wiring/ContainerCradle.ts'
);

try {
  const components = await scanComponents(sourceRoot, COMPONENT_ROLES);
  const cradleProperties = getCradlePropertyNames(cradlePath);
  const cradleSet = new Set(cradleProperties);

  const discoveredNames = new Set(components.map((c) => c.registrationName));

  for (const component of components) {
    const expectedName = toRegistrationName(component.className);
    if (component.registrationName !== expectedName) {
      console.error(
        `[validate-wiring] Mismatch: class ${component.className} produced registration name '${component.registrationName}' but expected '${expectedName}'`
      );
      process.exit(1);
    }
  }

  const missingInCradle = [...discoveredNames].filter(
    (name) => !cradleSet.has(name)
  );
  if (missingInCradle.length > 0) {
    console.error(
      `[validate-wiring] Discovered components missing from ContainerCradle: ${missingInCradle.join(', ')}`
    );
    process.exit(1);
  }

  const extraInCradle = cradleProperties.filter(
    (prop) => !discoveredNames.has(prop) && !EXPLICIT_NAMES.has(prop)
  );
  if (extraInCradle.length > 0) {
    console.error(
      `[validate-wiring] ContainerCradle has extra properties not found in scan: ${extraInCradle.join(', ')}`
    );
    process.exit(1);
  }

  console.log(
    `[validate-wiring] OK (${components.length} components validated and synchronized with ContainerCradle)`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[validate-wiring] Error: ${message}`);
  process.exit(1);
}
