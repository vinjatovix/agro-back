// Public sort keys of the plant listing and the paths they order by. Shared by
// the write and read repositories so both sort the same way.
export const PLANT_SORT_FIELDS: Readonly<Record<string, string>> = {
  name: 'identity.name.primary',
  scientificName: 'identity.scientificName'
};

export const toPlantSortField = (key: string): string =>
  PLANT_SORT_FIELDS[key] ?? key;
