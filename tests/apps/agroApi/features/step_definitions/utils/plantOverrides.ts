import { assert } from 'chai';

import type { AgroWorld } from './world.js';

// Columns `name`, `scientificName` and `family` (`first` → <familyId>, `other`
// → <otherFamilyId>); any other column is a dot path of the plant, its cell
// parsed as JSON when it can be. A missing column or an empty cell keeps the
// seeder default.
const PLANT_FAMILIES: Readonly<Record<string, 'familyId' | 'otherFamilyId'>> = {
  first: 'familyId',
  other: 'otherFamilyId'
};

// Plain-text columns: their cells are names, never parsed as JSON.
const NAME_PATHS: Readonly<Record<string, string>> = {
  name: 'identity.name.primary',
  scientificName: 'identity.scientificName'
};

const parseCell = (cell: string): unknown => {
  try {
    return JSON.parse(cell) as unknown;
  } catch {
    return cell;
  }
};

export const plantOverrides = (
  world: AgroWorld,
  { family = 'first', ...cells }: Record<string, string>
): Record<string, unknown> => {
  const familyKey = PLANT_FAMILIES[family];
  assert.exists(familyKey, `Unknown family "${family}"`);
  assert.exists(
    world[familyKey],
    `No ${familyKey} in the scenario: seed the "${family}" family first`
  );

  return {
    'identity.family': world[familyKey],
    ...Object.fromEntries(
      Object.entries(cells)
        .filter(([, cell]) => cell !== '')
        .map(([column, cell]) => {
          const namePath = NAME_PATHS[column];

          return namePath ? [namePath, cell] : [column, parseCell(cell)];
        })
    )
  };
};
