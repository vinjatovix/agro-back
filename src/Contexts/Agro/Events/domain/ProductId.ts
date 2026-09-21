import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type ProductId = Brand<string, 'ProductId'>;

const generator = createIdGenerator<ProductId>('ProductId');

export function createProductId(value: string): ProductId {
  return generator.create(value);
}

export function randomProductId(): ProductId {
  return generator.random();
}
