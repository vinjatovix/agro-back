import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isClass, type Constructor, type LifetimeType } from 'awilix';
import { globSync } from 'glob';

import type { ComponentRole, ComponentRoleName } from './componentRoles.js';
import { ContainerWiringError } from './ContainerWiringError.js';

export type ScannedComponent = {
  file: string;
  className: string;
  role: ComponentRoleName;
  registrationName: string;
  lifetime: LifetimeType;
  class: Constructor<unknown>;
};

function findFilesForRole(sourceRoot: string, role: ComponentRole): string[] {
  const matches = globSync(role.globs as string[], {
    cwd: sourceRoot,
    ignore: role.ignore as string[],
    absolute: true
  });
  return matches;
}

async function inspectFileExports(
  file: string,
  role: ComponentRole
): Promise<ScannedComponent[]> {
  const fileUrl = pathToFileURL(file).href;
  const moduleExports = (await import(fileUrl)) as Record<string, unknown>;
  const components: ScannedComponent[] = [];
  const expectedClassName = path.parse(file).name;

  for (const [exportName, exportValue] of Object.entries(moduleExports)) {
    if (typeof exportValue !== 'function' || !isClass(exportValue)) {
      continue;
    }

    if (exportName !== expectedClassName) {
      throw ContainerWiringError.classNameMismatch(file, exportName);
    }

    if (!role.classRule(exportName)) {
      throw ContainerWiringError.unrecognizedClass(file, exportName);
    }

    components.push({
      file,
      className: exportName,
      role: role.name,
      registrationName: role.toName(exportName),
      lifetime: role.lifetime,
      class: exportValue as Constructor<unknown>
    });
  }

  return components;
}

function detectDuplicateNames(components: readonly ScannedComponent[]): void {
  const seen = new Map<string, ScannedComponent>();
  for (const component of components) {
    const existing = seen.get(component.registrationName);
    if (existing && existing.file !== component.file) {
      throw ContainerWiringError.duplicateName(
        component.registrationName,
        existing.file,
        component.file
      );
    }
    seen.set(component.registrationName, component);
  }
}

export async function scanComponents(
  sourceRoot: string,
  roles: readonly ComponentRole[]
): Promise<ScannedComponent[]> {
  const allComponents: ScannedComponent[] = [];
  const processedFiles = new Set<string>();

  for (const role of roles) {
    const files = findFilesForRole(sourceRoot, role);
    files.sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      if (processedFiles.has(file)) {
        continue;
      }
      processedFiles.add(file);
      const components = await inspectFileExports(file, role);
      allComponents.push(...components);
    }
  }

  allComponents.sort((a, b) => a.file.localeCompare(b.file));
  detectDuplicateNames(allComponents);

  return allComponents;
}
