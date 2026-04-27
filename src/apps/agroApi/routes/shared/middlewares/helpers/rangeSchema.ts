import { body } from 'express-validator';

export const rangeSchema = (path: string) => [
  body(`${path}.min`).exists().isNumeric(),
  body(`${path}.max`).exists().isNumeric()
];
