export const toHeaderRecord = (
  headers: Record<string, unknown>
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.map(String);
    } else if (typeof value === 'number') {
      result[key] = String(value);
    }
  }

  return result;
};
