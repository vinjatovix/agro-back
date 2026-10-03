import { readFileSync } from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

import { SOURCE_ROOT } from '../../../shared/sourceRoot.js';

// The catalog read path must never build an aggregate: its modules take no
// value from the domain, and not even a type from the aggregate and value
// object folders. Primitive types under `domain/**/types/` are allowed.

type ImportStatement = {
  file: string;
  typeOnly: boolean;
  target: string;
};

const READ_MODULES = [
  'Contexts/Agro/{Plants,Families}/application/queries/**/*.ts',
  'Contexts/Agro/**/infrastructure/persistence/**/*Read*.ts',
  'Contexts/shared/infrastructure/persistence/mongo/MongoReadRepository.ts',
  'Contexts/shared/infrastructure/persistence/mongo/MongoPageQuery.ts'
];

const READ_USE_CASES = [
  'Contexts/Agro/Plants/application/useCases/GetPlant.ts',
  'Contexts/Agro/Plants/application/useCases/ListPlants.ts',
  'Contexts/Agro/Families/application/useCases/GetFamilyById.ts',
  'Contexts/Agro/Families/application/useCases/GetFamilyBySlug.ts',
  'Contexts/Agro/Families/application/useCases/ListFamilies.ts'
];

const READ_CONTROLLERS = [
  'apps/agroApi/controllers/Plants/GetPlantByIdController.ts',
  'apps/agroApi/controllers/Plants/GetAllPlantsController.ts',
  'apps/agroApi/controllers/Families/GetFamilyBySlugController.ts',
  'apps/agroApi/controllers/Families/GetAllFamiliesController.ts'
];

const DOMAIN_MAPPERS = /\b(plantDomainMapper|familyDomainMapper)\b/;

// `import …` and `export … from` statements, multi-line included.
const STATEMENT =
  /^(import|export)\s+(type\s+)?[^'";]*?\s*from\s+['"]([^'"]+)['"]/gms;

const AGGREGATE_FOLDERS = new Set(['entities', 'value-objects']);

const readModuleFiles = (): string[] =>
  globSync(READ_MODULES, { cwd: SOURCE_ROOT, absolute: true }).sort();

const importsOf = (file: string): ImportStatement[] =>
  [...readFileSync(file, 'utf8').matchAll(STATEMENT)].map(
    ([, , typeKeyword, specifier]) => ({
      file: path.relative(SOURCE_ROOT, file),
      typeOnly: typeKeyword !== undefined,
      target: path.resolve(path.dirname(file), specifier as string)
    })
  );

const domainSegments = (target: string): string[] | undefined => {
  const parts = path.relative(SOURCE_ROOT, target).split(path.sep);
  const domainIndex = parts.lastIndexOf('domain');

  return domainIndex === -1 ? undefined : parts.slice(domainIndex + 1);
};

/** A module directly inside `domain/entities/` or `domain/value-objects/`. */
const isAggregateModule = (segments: string[]): boolean =>
  segments.length === 2 && AGGREGATE_FOLDERS.has(segments[0] as string);

const describeImport = ({ file, target }: ImportStatement): string =>
  `${file} → ${path.relative(SOURCE_ROOT, target)}`;

describe('read model boundary', () => {
  const files = readModuleFiles();
  const statements = files.flatMap(importsOf);

  it('finds the read modules to check', () => {
    const relative = files.map((file) => path.relative(SOURCE_ROOT, file));

    expect(relative).toEqual(
      expect.arrayContaining([
        'Contexts/Agro/Plants/application/queries/PlantReadRepository.ts',
        'Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantReadRepository.ts',
        'Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.ts',
        'Contexts/shared/infrastructure/persistence/mongo/MongoReadRepository.ts'
      ])
    );
  });

  it('takes no value from the domain', () => {
    const valueImports = statements.filter(
      (statement) =>
        !statement.typeOnly && domainSegments(statement.target) !== undefined
    );

    expect(valueImports.map(describeImport)).toEqual([]);
  });

  it('imports nothing from the aggregate and value object folders', () => {
    const aggregateImports = statements.filter((statement) => {
      const segments = domainSegments(statement.target);

      return segments !== undefined && isAggregateModule(segments);
    });

    expect(aggregateImports.map(describeImport)).toEqual([]);
  });

  it.each([...READ_USE_CASES, ...READ_CONTROLLERS])(
    '%s does not use a domain mapper',
    (file) => {
      const source = readFileSync(path.join(SOURCE_ROOT, file), 'utf8');

      expect(source).not.toMatch(DOMAIN_MAPPERS);
    }
  );
});
