import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type BedId = Brand<string, 'BedId'>;

const generator = createIdGenerator<BedId>('BedId');

export function createBedId(value: string): BedId {
  return generator.create(value);
}

export function randomBedId(): BedId {
  return generator.random();
}
