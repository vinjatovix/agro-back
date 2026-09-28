export type PlantIdentityChanges = {
  name?: {
    primary?: string;
    aliases?: string[];
  };
  scientificName?: string;
  family?: string;
};
