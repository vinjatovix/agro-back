import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type PlantId = Brand<string, 'PlantId'>;

const generator = createIdGenerator<PlantId>('PlantId');

export function createPlantId(value: string): PlantId {
  return generator.create(value);
}

export function randomPlantId(): PlantId {
  return generator.random();
}
