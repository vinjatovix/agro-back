import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'node:path';
import type { OpenAPIV3 } from 'openapi-types';
import httpStatus from 'http-status';
import { escapeRegex } from '../../../src/shared/utils/escapeRegex.js';

type Input = {
  path: string;
  method: string;
  status: number;
  body: unknown;
};

type TypePredicate = (value: unknown) => boolean;

const OPENAPI_PATH = path.resolve(
  process.cwd(),
  'src/apps/agroApi/openapi/openapi.yaml'
);

const typeValidators: Record<string, TypePredicate> = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number',
  integer: (value) => Number.isInteger(value),
  boolean: (value) => typeof value === 'boolean'
};

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

function convertOpenApiPathToRegExp(openApiPath: string): RegExp {
  const parameterPattern = /{[^}]+}/g;
  const parameterPlaceholder = '__PARAMETER_PLACEHOLDER__';
  const pathWithPlaceholders = openApiPath.replaceAll(
    parameterPattern,
    parameterPlaceholder
  );
  const escapedPath = escapeRegex(pathWithPlaceholders);
  const regexPattern = escapedPath.replaceAll(parameterPlaceholder, '[^/]+');

  return new RegExp('^' + regexPattern + '$');
}

function matchPath(
  spec: OpenAPIV3.Document,
  inputPath: string,
  method: string
): string | null {
  const normalizedPath = normalizePath(inputPath);
  const lowercaseMethod = method.toLowerCase();

  return (
    Object.keys(spec.paths).find((openApiPath) => {
      const pathItem = spec.paths[openApiPath];
      const hasMethod = pathItem && lowercaseMethod in pathItem;
      if (!hasMethod) return false;

      const pathRegExp = convertOpenApiPathToRegExp(openApiPath);
      return pathRegExp.test(normalizedPath);
    }) ?? null
  );
}

function getResponseSchema(
  spec: OpenAPIV3.Document,
  path: string,
  method: string,
  status: number
): OpenAPIV3.SchemaObject | null {
  const pathWithoutQueryParams = new URL(path, 'http://localhost').pathname;
  const matchedPath = matchPath(spec, pathWithoutQueryParams, method);

  if (!matchedPath) {
    throw new Error(`Path not found in OpenAPI: ${pathWithoutQueryParams}`);
  }

  const operation =
    spec.paths[matchedPath]?.[
      method.toLowerCase() as keyof OpenAPIV3.PathItemObject
    ];
  if (
    !operation ||
    typeof operation !== 'object' ||
    !('responses' in operation)
  ) {
    throw new Error(`Operation not found: ${method} ${pathWithoutQueryParams}`);
  }

  const response = operation.responses?.[String(status)];
  if (!response || typeof response === 'string' || !('content' in response)) {
    throw new Error(
      `Response not found: ${method} ${pathWithoutQueryParams} ${status}`
    );
  }

  const schema = response.content?.['application/json']?.schema;
  return (schema as OpenAPIV3.SchemaObject) ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePrimitive(
  schema: OpenAPIV3.SchemaObject,
  value: unknown,
  path: string
): string | null {
  if (value === null || value === undefined) {
    return `[${path}] Expected ${schema.type ?? 'value'}, received null or undefined`;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return `[${path}] Expected one of [${schema.enum.join(', ')}], received ${JSON.stringify(value)}`;
  }

  const expectedType = schema.type;
  if (!expectedType) {
    return null;
  }

  const validator = typeValidators[expectedType];
  if (validator && !validator(value)) {
    return `[${path}] Expected ${expectedType}, received ${typeof value}`;
  }

  return null;
}

function validateShape(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  path = 'body'
): string[] {
  if (body === null) {
    if (!schema.nullable) {
      return [`[${path}] Field is not nullable but received null`];
    }
    return [];
  }

  if (body === undefined) {
    return [`[${path}] Field is required but received undefined`];
  }

  return validateBySchemaType(body, schema, path);
}

function validateBySchemaType(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  path: string
): string[] {
  switch (schema.type) {
    case 'array':
      return validateArray(body, schema, path);

    case 'object':
      return validateObject(body, schema, path);

    default: {
      const primitiveError = validatePrimitive(schema, body, path);
      return primitiveError ? [primitiveError] : [];
    }
  }
}

function validateArray(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  path: string
): string[] {
  if (!Array.isArray(body)) {
    return [`[${path}] Expected array, received ${typeof body}`];
  }

  if (schema.type !== 'array') {
    return [];
  }

  const items = schema.items as OpenAPIV3.SchemaObject | undefined;

  if (!items) {
    return [];
  }

  return body.flatMap((item, index) =>
    validateShape(item, items, `${path}[${index}]`)
  );
}

function validateAdditionalProperties(
  obj: Record<string, unknown>,
  allowedKeys: string[],
  additionalPropertiesSchema: OpenAPIV3.SchemaObject['additionalProperties'],
  path: string
): string[] {
  return Object.keys(obj).flatMap((key) => {
    if (allowedKeys.includes(key)) {
      return [];
    }

    if (additionalPropertiesSchema === false) {
      return [`[${path}] Key '${key}' is not allowed by OpenAPI schema`];
    }

    if (
      typeof additionalPropertiesSchema === 'object' &&
      additionalPropertiesSchema !== null
    ) {
      return validateShape(
        obj[key],
        additionalPropertiesSchema as OpenAPIV3.SchemaObject,
        `${path}.${key}`
      );
    }

    return [];
  });
}

function validateDeclaredProperties(
  obj: Record<string, unknown>,
  properties: Record<
    string,
    OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  >,
  requiredFields: string[] | undefined,
  path: string
): string[] {
  return Object.entries(properties).flatMap(([key, prop]) => {
    const value = obj[key];
    const propertySchema = prop as OpenAPIV3.SchemaObject;
    const isRequired = requiredFields?.includes(key) ?? false;

    return validateObjectField(
      value,
      propertySchema,
      isRequired,
      `${path}.${key}`
    );
  });
}

function validateObject(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  path: string
): string[] {
  if (!isObject(body)) {
    return [`[${path}] Expected object, received ${typeof body}`];
  }

  const properties = schema.properties ?? {};
  const requiredErrors = validateRequiredFields(body, schema.required, path);

  const additionalErrors = validateAdditionalProperties(
    body,
    Object.keys(properties),
    schema.additionalProperties,
    path
  );

  const propertyErrors = validateDeclaredProperties(
    body,
    properties,
    schema.required,
    path
  );

  return [...requiredErrors, ...additionalErrors, ...propertyErrors];
}

function validateRequiredFields(
  obj: Record<string, unknown>,
  required: string[] | undefined,
  path: string
): string[] {
  if (!required) {
    return [];
  }

  return required
    .filter((key) => obj[key] === undefined)
    .map((key) => `[${path}.${key}] Missing required field`);
}

function validateObjectField(
  value: unknown,
  schema: OpenAPIV3.SchemaObject,
  isRequired: boolean,
  path: string
): string[] {
  if (value === undefined) {
    if (isRequired) {
      return [`[${path}] Field is required but received undefined`];
    }
    return [];
  }

  if (value === null) {
    if (!schema.nullable) {
      return [`[${path}] Field is not nullable but received null`];
    }
    return [];
  }

  return validateShape(value, schema, path);
}

export async function assertResponseMatchesOpenAPI({
  path,
  method,
  status,
  body
}: Input): Promise<void> {
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

  const spec = await loadSpec();
  const schema = getResponseSchema(spec, path, method, status);

  if (!schema) {
    throw new Error(`No schema found for ${method} ${path} ${status}`);
  }

  const errors = validateShape(body, schema, 'body');

  if (errors.length > 0) {
    throw new Error(
      `OpenAPI contract violation for ${method} ${path} ${status}.\nValidation errors:\n- ${errors.join('\n- ')}`
    );
  }
}
