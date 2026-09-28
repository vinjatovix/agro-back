export interface IdentityPrimitives {
  name: {
    primary: string;
    aliases?: string[];
  };
  family: string;
  scientificName?: string | null;
}
