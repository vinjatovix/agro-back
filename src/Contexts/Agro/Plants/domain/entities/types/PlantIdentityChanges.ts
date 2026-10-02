// PATCH semantics: an absent field is kept, `null` removes an optional one.
export type PlantIdentityChanges = {
  name?: {
    primary?: string;
    aliases?: string[] | null;
  };
  scientificName?: string;
  family?: string;
};
