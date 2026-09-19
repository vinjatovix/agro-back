import type { CreateBedDto } from './CreateBedDto.js';

export type CreateBedInput = CreateBedDto & {
  userId: string;
};
