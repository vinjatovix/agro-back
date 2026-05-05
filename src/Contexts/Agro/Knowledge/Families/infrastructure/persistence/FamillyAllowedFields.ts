type FieldConfig = {
  type: 'string' | 'array' | 'number';
};

export const FAMILY_FIELDS: Record<string, FieldConfig> = {
  name: { type: 'string' },
  slug: { type: 'string' },
  aliases: { type: 'array' }
};
