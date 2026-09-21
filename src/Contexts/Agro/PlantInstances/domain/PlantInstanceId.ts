import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type PlantInstanceId = Brand<string, 'PlantInstanceId'>;

const generator = createIdGenerator<PlantInstanceId>('PlantInstanceId');

export function createPlantInstanceId(value: string): PlantInstanceId {
  return generator.create(value);
}

export function randomPlantInstanceId(): PlantInstanceId {
  return generator.random();
}
