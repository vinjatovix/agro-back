import type { CollectionIndex } from './CollectionIndex.js';

export interface IndexConfig {
  collection: string;
  indexes: CollectionIndex[];
}
