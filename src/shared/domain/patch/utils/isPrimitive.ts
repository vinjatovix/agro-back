export const isPrimitive = (value: unknown): boolean => {
  return value === null || value === undefined || typeof value !== 'object';
};
