import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export function loadOpenApiSpec() {
  const filePath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    'openapi.yaml'
  );

  const file = fs.readFileSync(filePath, 'utf8');

  const doc = yaml.load(file);

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid OpenAPI spec');
  }

  return doc as Record<string, unknown>;
}
