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

const normalizePath = (path: string): string => path.replace(/\/+$/, '');

async function loadSpec(): Promise<OpenAPIV3.Document> {
  if (cachedSpec) return cachedSpec;
  const spec = (await SwaggerParser.dereference(OPENAPI_PATH)) as unknown;
  if (!spec || typeof spec !== 'object' || !('paths' in spec)) {
    throw new Error('Parsed OpenAPI spec is invalid.');
  }
  cachedSpec = spec as OpenAPIV3.Document;

  return cachedSpec;
}

function matchPath(spec: OpenAPIV3.Document, inputPath: string): string | null {
  const normalized = normalizePath(inputPath);

  return (
    Object.keys(spec.paths).find((p) => {
      const regex = new RegExp('^' + p.replaceAll(/{[^}]+}/g, '[^/]+') + '$');
      return regex.test(normalized);
    }) ?? null
  );
}

function getResponseSchema(
  spec: OpenAPIV3.Document,
  path: string,
  method: string,
  status: number
): OpenAPIV3.SchemaObject | null {
  const normalizedPath = new URL(path, 'http://localhost').pathname;

  const matchedPath = matchPath(spec, normalizedPath);

  if (!matchedPath) {
    throw new Error(`Path not found in OpenAPI: ${normalizedPath}`);
  }

  const pathItem = spec.paths[matchedPath];

  const operation =
    pathItem?.[method.toLowerCase() as keyof OpenAPIV3.PathItemObject];

  if (!operation || typeof operation === 'string') {
    throw new Error(`Operation not found: ${method} ${normalizedPath}`);
  }

  const responses = (operation as OpenAPIV3.OperationObject).responses;

  const response = responses?.[String(status)];

  if (!response || typeof response === 'string') {
    throw new Error(
      `Response not found: ${method} ${normalizedPath} ${status}`
    );
  }

  const content = (response as OpenAPIV3.ResponseObject).content;

  const schema = content?.['application/json']?.schema;

  return (schema as OpenAPIV3.SchemaObject) ?? null;
}

/**
 * =========================
 * TYPE GUARDS
 * =========================
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrimitiveValid(type: string | undefined, value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

/**
 * =========================
 * VALIDATION CORE
 * =========================
 */

function validateShape(body: unknown, schema: OpenAPIV3.SchemaObject): boolean {
  if (body === null || body === undefined) {
    return Boolean(schema.nullable) || !schema.required?.length;
  }

  return validateBySchemaType(body, schema);
}

function validateBySchemaType(
  body: unknown,
  schema: OpenAPIV3.SchemaObject
): boolean {
  switch (schema.type) {
    case 'array':
      return validateArray(body, schema);

    case 'object':
      return validateObject(body, schema);

    default:
      return isPrimitiveValid(schema.type, body);
  }
}

function validateArray(body: unknown, schema: OpenAPIV3.SchemaObject): boolean {
  if (!Array.isArray(body)) {
    return false;
  }

  if (schema.type !== 'array') {
    return true;
  }

  const items = schema.items as OpenAPIV3.SchemaObject | undefined;

  if (!items) {
    return true;
  }

  return body.every((item) => validateShape(item, items));
}

function validateObject(
  body: unknown,
  schema: OpenAPIV3.SchemaObject
): boolean {
  if (!isObject(body)) {
    return false;
  }

  const props = schema.properties ?? {};
  const obj = body;

  if (!validateRequiredFields(obj, schema.required)) {
    return false;
  }

  for (const [key, prop] of Object.entries(props)) {
    const value = obj[key];
    const ps = prop as OpenAPIV3.SchemaObject;

    const isRequired = schema.required?.includes(key) ?? false;

    if (!validateObjectField(value, ps, isRequired)) {
      return false;
    }
  }

  return true;
}

function validateRequiredFields(
  obj: Record<string, unknown>,
  required?: string[]
): boolean {
  if (!required) {
    return true;
  }

  for (const key of required) {
    if (obj[key] === undefined) {
      return false;
    }
  }

  return true;
}

function validateObjectField(
  value: unknown,
  schema: OpenAPIV3.SchemaObject,
  isRequired: boolean
): boolean {
  if (value === undefined && !isRequired) {
    return true;
  }

  if (value === null && Boolean(schema.nullable)) {
    return true;
  }

  if (schema.type === 'object' || schema.type === 'array') {
    return validateShape(value, schema);
  }

  return isPrimitiveValid(schema.type, value);
}

/**
 * =========================
 * PUBLIC API
 * =========================
 */

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
