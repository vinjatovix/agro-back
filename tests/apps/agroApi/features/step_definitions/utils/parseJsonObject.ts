export const parseJsonObject = (
  value: string
): Record<string, unknown> | unknown[] => {
  return JSON.parse(value) as Record<string, unknown> | unknown[];
};
