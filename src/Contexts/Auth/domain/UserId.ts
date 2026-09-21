import type { Brand } from '../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../shared/domain/valueObject/BrandedId.js';

export type UserId = Brand<string, 'UserId'>;

const generator = createIdGenerator<UserId>('UserId');

export function createUserId(value: string): UserId {
  return generator.create(value);
}

export function randomUserId(): UserId {
  return generator.random();
}
