import { Lifetime, type LifetimeType } from 'awilix';

export type ComponentRoleName =
  | 'useCase'
  | 'controller'
  | 'repository'
  | 'queryMapper'
  | 'adapter'
  | 'environmentArranger';

export type ComponentRole = {
  name: ComponentRoleName;
  globs: readonly string[];
  ignore: readonly string[];
  classRule: (className: string) => boolean;
  toName: (className: string) => string;
  lifetime: LifetimeType;
};

export const COMMON_IGNORES: readonly string[] = [
  '**/index.*',
  '**/requestSchemas.*',
  '**/*.test.*',
  '**/*.d.ts',
  '**/interfaces/**',
  '**/types/**'
];

export const ROLE_SUFFIXES = [
  'Controller',
  'Repository',
  'QueryMapper',
  'Adapter',
  'EnvironmentArranger'
] as const;

export function toRegistrationName(className: string): string {
  let name = className;
  if (
    name.startsWith('Mongo') &&
    name.length > 5 &&
    name.charAt(5) === name.charAt(5).toUpperCase()
  ) {
    name = name.slice(5);
  }
  if (name.endsWith('Adapter') && name.length > 7) {
    name = name.slice(0, -7);
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export const COMPONENT_ROLES: readonly ComponentRole[] = [
  {
    name: 'useCase',
    globs: ['Contexts/**/application/useCases/**/[A-Z]*.{ts,js}'],
    ignore: COMMON_IGNORES,
    classRule: (className: string): boolean =>
      className.length > 0 &&
      className.charAt(0) === className.charAt(0).toUpperCase() &&
      !ROLE_SUFFIXES.some((suffix) => className.endsWith(suffix)),
    toName: toRegistrationName,
    lifetime: Lifetime.SCOPED
  },
  {
    name: 'controller',
    globs: ['apps/agroApi/controllers/**/[A-Z]*.{ts,js}'],
    ignore: COMMON_IGNORES,
    classRule: (className: string): boolean =>
      className.endsWith('Controller') &&
      className.length > 'Controller'.length,
    toName: toRegistrationName,
    lifetime: Lifetime.SCOPED
  },
  {
    name: 'repository',
    globs: ['Contexts/**/infrastructure/persistence/**/[A-Z]*.{ts,js}'],
    ignore: [...COMMON_IGNORES, '**/Contexts/shared/**', '**/*QueryMapper.*'],
    classRule: (className: string): boolean =>
      className.startsWith('Mongo') &&
      className.endsWith('Repository') &&
      className.length > 'MongoRepository'.length,
    toName: toRegistrationName,
    lifetime: Lifetime.SINGLETON
  },
  {
    name: 'queryMapper',
    globs: [
      'Contexts/**/infrastructure/persistence/**/[A-Z]*QueryMapper.{ts,js}'
    ],
    ignore: [...COMMON_IGNORES, '**/Contexts/shared/**'],
    classRule: (className: string): boolean =>
      className.endsWith('QueryMapper') &&
      className.length > 'QueryMapper'.length,
    toName: toRegistrationName,
    lifetime: Lifetime.SINGLETON
  },
  {
    name: 'adapter',
    globs: ['Contexts/shared/plugins/**/[A-Z]*.{ts,js}'],
    ignore: COMMON_IGNORES,
    classRule: (className: string): boolean =>
      className.endsWith('Adapter') && className.length > 'Adapter'.length,
    toName: toRegistrationName,
    lifetime: Lifetime.SINGLETON
  },
  {
    name: 'environmentArranger',
    globs: [
      'shared/infrastructure/persistence/**/*EnvironmentArranger.{ts,js}'
    ],
    ignore: COMMON_IGNORES,
    classRule: (className: string): boolean =>
      className.startsWith('Mongo') &&
      className.endsWith('EnvironmentArranger') &&
      className.length >= 'MongoEnvironmentArranger'.length,
    toName: toRegistrationName,
    lifetime: Lifetime.SINGLETON
  }
];
