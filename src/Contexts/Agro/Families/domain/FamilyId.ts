import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type FamilyId = Brand<string, 'FamilyId'>;

const generator = createIdGenerator<FamilyId>('FamilyId');

export function createFamilyId(value: string): FamilyId {
  return generator.create(value);
}

export function randomFamilyId(): FamilyId {
  return generator.random();
}
