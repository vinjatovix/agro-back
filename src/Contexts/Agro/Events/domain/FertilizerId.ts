import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type FertilizerId = Brand<string, 'FertilizerId'>;

const generator = createIdGenerator<FertilizerId>('FertilizerId');

export function createFertilizerId(value: string): FertilizerId {
  return generator.create(value);
}

export function randomFertilizerId(): FertilizerId {
  return generator.random();
}
