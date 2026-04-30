import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'node:path';
import type { OpenAPIV3 } from 'openapi-types';
import httpStatus from 'http-status';

type Input = {
  path: string;
  method: string;
  status: number;
  body: unknown;
};

const OPENAPI_PATH = path.resolve(
  process.cwd(),
  'src/apps/agroApi/openapi/openapi.yaml'
);

let cachedSpec: OpenAPIV3.Document | null = null;

async function loadSpec(): Promise<OpenAPIV3.Document> {
  if (cachedSpec) return cachedSpec;

  let spec: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    spec = await SwaggerParser.dereference(OPENAPI_PATH);
  } catch (err: unknown) {
    throw new Error(
      `Failed to parse OpenAPI spec: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }

  if (!spec || typeof spec !== 'object' || !('paths' in spec)) {
    throw new Error('Parsed OpenAPI spec is invalid.');
  }

  cachedSpec = spec as OpenAPIV3.Document;
  return cachedSpec;
}

function matchPath(spec: OpenAPIV3.Document, path: string): string | null {
  return (
    Object.keys(spec.paths).find((p) => {
      const regex = new RegExp('^' + p.replace(/{[^}]+}/g, '[^/]+') + '$');
      return regex.test(path);
    }) ?? null
  );
}

function getResponseSchema(
  spec: OpenAPIV3.Document,
  path: string,
  method: string,
  status: number
): unknown {
  const matchedPath = matchPath(spec, path);

  if (!matchedPath) {
    throw new Error(`Path not found in OpenAPI: ${path}`);
  }

  const pathItem = spec.paths[matchedPath];

  const operation =
    pathItem?.[method.toLowerCase() as keyof OpenAPIV3.PathItemObject];

  if (!operation || typeof operation === 'string') {
    throw new Error(`Operation not found: ${method} ${path}`);
  }

  const responses = (operation as OpenAPIV3.OperationObject).responses;

  const response = responses?.[String(status)];

  if (!response || typeof response === 'string') {
    throw new Error(`Response not found: ${method} ${path} ${status}`);
  }

  const content = (response as OpenAPIV3.ResponseObject).content;

  return content?.['application/json']?.schema ?? null;
}

function validateShape(body: unknown, schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return true;

  type SchemaObject = {
    type?: string;
    properties?: Record<string, SchemaObject>;
  };

  const s = schema as SchemaObject;

  if (s.type === 'object') {
    if (typeof body !== 'object' || body === null) return false;

    const props = s.properties ?? {};

    for (const key of Object.keys(props)) {
      const expected = props[key];
      const value = (body as Record<string, unknown>)[key];

      if (expected?.type === 'string' && typeof value !== 'string') {
        return false;
      }

      if (expected?.type === 'number' && typeof value !== 'number') {
        return false;
      }

      if (expected?.type === 'boolean' && typeof value !== 'boolean') {
        return false;
      }
    }
  }

  return true;
}

export async function assertResponseMatchesOpenAPI({
  path,
  method,
  status,
  body
}: Input): Promise<void> {
  const spec = await loadSpec();

  const schema = getResponseSchema(spec, path, method, status);

  if (status === httpStatus.NO_CONTENT) {
    const isEmpty =
      body === undefined ||
      body === null ||
      (typeof body === 'object' &&
        body !== null &&
        Object.keys(body).length === 0);

    if (!isEmpty) {
      throw new Error('204 must have empty body');
    }

    return;
  }

  if (!schema) {
    throw new Error(`No schema found for ${method} ${path} ${status}`);
  }

  const valid = validateShape(body, schema);

  if (!valid) {
    throw new Error(
      `OpenAPI contract violation for ${method} ${path} ${status}`
    );
  }
}
