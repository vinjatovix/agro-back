export interface CollectionIndex {
  fields: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    name?: string;
  };
}
