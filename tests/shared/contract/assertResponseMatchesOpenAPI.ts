import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'node:path';
import type { OpenAPIV3 } from 'openapi-types';

export type OpenAPIValidatorInput = {
  specPath: string;
  path: string;
  method: string;
  status: number;
  body: unknown;
};

type TypePredicate = (value: unknown) => boolean;

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePath = (p: string): string => p.replace(/\/+$/, '');

const typeValidators: Record<string, TypePredicate> = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number',
  integer: (value) => Number.isInteger(value),
  boolean: (value) => typeof value === 'boolean'
};

const formatValidators: Record<string, (val: string) => boolean> = {
  uuid: (val) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      val
    ),
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  'date-time': (val) => !Number.isNaN(Date.parse(val)) && val.includes('T'),
  uri: (val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }
};

const specCache = new Map<string, OpenAPIV3.Document>();

async function loadSpec(specPath: string): Promise<OpenAPIV3.Document> {
  const absolutePath = path.resolve(process.cwd(), specPath);
  if (specCache.has(absolutePath)) {
    return specCache.get(absolutePath)!;
  }

  const spec = (await SwaggerParser.dereference(absolutePath)) as unknown;
  if (!spec || typeof spec !== 'object' || !('paths' in spec)) {
    throw new Error(`Parsed OpenAPI spec is invalid at ${absolutePath}`);
  }

  specCache.set(absolutePath, spec as OpenAPIV3.Document);
  return spec as OpenAPIV3.Document;
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

function findExactPathMatch(
  spec: OpenAPIV3.Document,
  normalizedPath: string,
  lowercaseMethod: string
): string | null {
  if (spec.paths[normalizedPath]) {
    const pathItem = spec.paths[normalizedPath];
    const hasMethod = pathItem && lowercaseMethod in pathItem;
    if (hasMethod) {
      return normalizedPath;
    }
  }
  return null;
}

function findDynamicPathMatch(
  spec: OpenAPIV3.Document,
  normalizedPath: string,
  lowercaseMethod: string
): string | null {
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

function matchPath(
  spec: OpenAPIV3.Document,
  inputPath: string,
  method: string
): string | null {
  const normalizedPath = normalizePath(inputPath);
  const lowercaseMethod = method.toLowerCase();

  const exactMatch = findExactPathMatch(spec, normalizedPath, lowercaseMethod);
  if (exactMatch) {
    return exactMatch;
  }

  return findDynamicPathMatch(spec, normalizedPath, lowercaseMethod);
}

function extractPathnameWithoutQueryParams(pathString: string): string {
  return new URL(pathString, 'http://localhost').pathname;
}

function getOperation(
  spec: OpenAPIV3.Document,
  matchedPath: string,
  method: string,
  reqPath: string
): OpenAPIV3.OperationObject {
  const operation =
    spec.paths[matchedPath]?.[
      method.toLowerCase() as keyof OpenAPIV3.PathItemObject
    ];
  if (
    !operation ||
    typeof operation !== 'object' ||
    !('responses' in operation)
  ) {
    throw new Error(`Operation not found: ${method} ${reqPath}`);
  }
  return operation;
}

function extractSchemaFromOperation(
  operation: OpenAPIV3.OperationObject,
  status: number,
  method: string,
  reqPath: string
): OpenAPIV3.SchemaObject | null {
  const response = operation.responses?.[String(status)];
  if (!response || typeof response === 'string' || !('content' in response)) {
    throw new Error(`Response not found: ${method} ${reqPath} ${status}`);
  }

  const schema = response.content?.['application/json']?.schema;
  return (schema as OpenAPIV3.SchemaObject) ?? null;
}

function getResponseSchema(
  spec: OpenAPIV3.Document,
  p: string,
  method: string,
  status: number
): OpenAPIV3.SchemaObject | null {
  const pathWithoutQueryParams = extractPathnameWithoutQueryParams(p);
  const matchedPath = matchPath(spec, pathWithoutQueryParams, method);

  if (!matchedPath) {
    throw new Error(`Path not found in OpenAPI: ${pathWithoutQueryParams}`);
  }

  const operation = getOperation(
    spec,
    matchedPath,
    method,
    pathWithoutQueryParams
  );
  return extractSchemaFromOperation(
    operation,
    status,
    method,
    pathWithoutQueryParams
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateStringFormat(
  format: string,
  value: string,
  validationPath: string
): string | null {
  const formatCheck = formatValidators[format];
  if (formatCheck && !formatCheck(value)) {
    return `[${validationPath}] Expected string format '${format}', received '${value}'`;
  }
  return null;
}

function validateEnum(
  schema: OpenAPIV3.SchemaObject,
  value: unknown,
  validationPath: string
): string | null {
  if (schema.enum && !schema.enum.includes(value)) {
    return `[${validationPath}] Expected one of [${schema.enum.join(', ')}], received ${JSON.stringify(value)}`;
  }
  return null;
}

function validateType(
  schema: OpenAPIV3.SchemaObject,
  value: unknown,
  validationPath: string
): string | null {
  const expectedType = schema.type;
  if (!expectedType) {
    return null;
  }

  const validator = typeValidators[expectedType];
  if (validator && !validator(value)) {
    return `[${validationPath}] Expected ${expectedType}, received ${typeof value}`;
  }

  return null;
}

function validateFormat(
  schema: OpenAPIV3.SchemaObject,
  value: unknown,
  validationPath: string
): string | null {
  const expectedType = schema.type;
  if (expectedType === 'string' && schema.format && typeof value === 'string') {
    return validateStringFormat(schema.format, value, validationPath);
  }
  return null;
}

function validatePrimitive(
  schema: OpenAPIV3.SchemaObject,
  value: unknown,
  validationPath: string
): string | null {
  if (value === null || value === undefined) {
    return `[${validationPath}] Expected ${schema.type ?? 'value'}, received null or undefined`;
  }

  const enumError = validateEnum(schema, value, validationPath);
  if (enumError) return enumError;

  const typeError = validateType(schema, value, validationPath);
  if (typeError) return typeError;

  return validateFormat(schema, value, validationPath);
}

function validateAllOf(
  body: unknown,
  allOf: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject>,
  validationPath: string
): string[] {
  return allOf.flatMap((subSchema) =>
    validateShape(body, subSchema as OpenAPIV3.SchemaObject, validationPath)
  );
}

function validateAnyOf(
  body: unknown,
  anyOf: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject>,
  validationPath: string
): string[] {
  const anyOfErrors = anyOf.map((subSchema) =>
    validateShape(body, subSchema as OpenAPIV3.SchemaObject, validationPath)
  );
  const passedAtLeastOne = anyOfErrors.some((errs) => errs.length === 0);
  if (!passedAtLeastOne) {
    return [
      `[${validationPath}] Value does not match any of the provided 'anyOf' schemas`
    ];
  }
  return [];
}

function validateOneOf(
  body: unknown,
  oneOf: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject>,
  validationPath: string
): string[] {
  const passedCount = oneOf.filter(
    (subSchema) =>
      validateShape(body, subSchema as OpenAPIV3.SchemaObject, validationPath)
        .length === 0
  ).length;
  if (passedCount !== 1) {
    return [
      `[${validationPath}] Value matches ${passedCount} schemas from 'oneOf' (expected exactly 1)`
    ];
  }
  return [];
}

function validateShape(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  validationPath = 'body'
): string[] {
  if (body === null) {
    if (!schema.nullable) {
      return [`[${validationPath}] Field is not nullable but received null`];
    }
    return [];
  }

  if (body === undefined) {
    return [`[${validationPath}] Field is required but received undefined`];
  }

  return [
    ...(schema.allOf ? validateAllOf(body, schema.allOf, validationPath) : []),
    ...(schema.anyOf ? validateAnyOf(body, schema.anyOf, validationPath) : []),
    ...(schema.oneOf ? validateOneOf(body, schema.oneOf, validationPath) : []),
    ...(schema.type ? validateBySchemaType(body, schema, validationPath) : [])
  ];
}

function validateBySchemaType(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  validationPath: string
): string[] {
  switch (schema.type) {
    case 'array':
      return validateArray(body, schema, validationPath);

    case 'object':
      return validateObject(body, schema, validationPath);

    default: {
      const primitiveError = validatePrimitive(schema, body, validationPath);
      return primitiveError ? [primitiveError] : [];
    }
  }
}

function validateArray(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  validationPath: string
): string[] {
  if (!Array.isArray(body)) {
    return [`[${validationPath}] Expected array, received ${typeof body}`];
  }

  if (schema.type !== 'array') {
    return [];
  }

  const items = schema.items as OpenAPIV3.SchemaObject | undefined;

  if (!items) {
    return [];
  }

  return body.flatMap((item, index) =>
    validateShape(item, items, `${validationPath}[${index}]`)
  );
}

function validateUnknownProperty(
  key: string,
  value: unknown,
  additionalPropertiesSchema: OpenAPIV3.SchemaObject['additionalProperties'],
  validationPath: string
): string[] {
  if (additionalPropertiesSchema === false) {
    return [
      `[${validationPath}] Key '${key}' is not allowed by OpenAPI schema`
    ];
  }

  if (
    typeof additionalPropertiesSchema === 'object' &&
    additionalPropertiesSchema !== null
  ) {
    return validateShape(
      value,
      additionalPropertiesSchema as OpenAPIV3.SchemaObject,
      `${validationPath}.${key}`
    );
  }

  return [];
}

function validateAdditionalProperties(
  obj: Record<string, unknown>,
  allowedKeys: string[],
  additionalPropertiesSchema: OpenAPIV3.SchemaObject['additionalProperties'],
  validationPath: string
): string[] {
  return Object.keys(obj)
    .filter((key) => !allowedKeys.includes(key))
    .flatMap((key) =>
      validateUnknownProperty(
        key,
        obj[key],
        additionalPropertiesSchema,
        validationPath
      )
    );
}

function validateDeclaredProperties(
  obj: Record<string, unknown>,
  properties: Record<
    string,
    OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  >,
  requiredFields: string[] | undefined,
  validationPath: string
): string[] {
  return Object.entries(properties).flatMap(([key, prop]) => {
    const value = obj[key];
    if (value === undefined) {
      return [];
    }
    const propertySchema = prop as OpenAPIV3.SchemaObject;
    const isRequired = requiredFields?.includes(key) ?? false;

    return validateObjectField(
      value,
      propertySchema,
      isRequired,
      `${validationPath}.${key}`
    );
  });
}

function validateObject(
  body: unknown,
  schema: OpenAPIV3.SchemaObject,
  validationPath: string
): string[] {
  if (!isObject(body)) {
    return [`[${validationPath}] Expected object, received ${typeof body}`];
  }

  const properties = schema.properties ?? {};

  return [
    ...validateRequiredFields(body, schema.required, validationPath),
    ...validateAdditionalProperties(
      body,
      Object.keys(properties),
      schema.additionalProperties,
      validationPath
    ),
    ...validateDeclaredProperties(
      body,
      properties,
      schema.required,
      validationPath
    )
  ];
}

function validateRequiredFields(
  obj: Record<string, unknown>,
  required: string[] | undefined,
  validationPath: string
): string[] {
  if (!required) {
    return [];
  }

  return required
    .filter((key) => obj[key] === undefined)
    .map((key) => `[${validationPath}.${key}] Missing required field`);
}

function validateObjectField(
  value: unknown,
  schema: OpenAPIV3.SchemaObject,
  isRequired: boolean,
  validationPath: string
): string[] {
  if (value === undefined) {
    if (isRequired) {
      return [`[${validationPath}] Field is required but received undefined`];
    }
    return [];
  }

  if (value === null) {
    if (!schema.nullable) {
      return [`[${validationPath}] Field is not nullable but received null`];
    }
    return [];
  }

  return validateShape(value, schema, validationPath);
}

/**
 * Validates a given payload against an OpenAPI specification dynamically.
 * Ideal for Jest/Supertest integration tests to ensure Contract-First compliance.
 */
export async function assertResponseMatchesOpenAPI({
  specPath,
  path: reqPath,
  method,
  status,
  body
}: OpenAPIValidatorInput): Promise<void> {
  if (status === 204) {
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

  const spec = await loadSpec(specPath);
  const schema = getResponseSchema(spec, reqPath, method, status);

  if (!schema) {
    throw new Error(`No schema found for ${method} ${reqPath} ${status}`);
  }

  const errors = validateShape(body, schema, 'body');

  if (errors.length > 0) {
    throw new Error(
      `OpenAPI contract violation for ${method} ${reqPath} ${status}.\nValidation errors:\n- ${errors.join('\n- ')}`
    );
  }
}
