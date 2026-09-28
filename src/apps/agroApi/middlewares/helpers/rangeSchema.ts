import { body } from 'express-validator';

export const rangeSchema = (path: string, options?: { optional?: boolean }) => {
  const chain = options?.optional
    ? body(path).optional().isObject()
    : body(path).exists().isObject();

  return [
    chain,
    body(`${path}.min`).optional().isNumeric(),
    body(`${path}.max`).optional().isNumeric()
  ];
};
