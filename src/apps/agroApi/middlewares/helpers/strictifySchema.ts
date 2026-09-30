import { z } from 'zod';

import { createError } from '../../../../shared/errors/index.js';

type KnownSchema = z.core.$ZodTypes;
type KnownDef = KnownSchema['_zod']['def'];
// Keys cached by one `strictifySchema` call, dropped if that call fails.
type Walk = { entries: z.core.$ZodType[] };
// Handlers re-check `def.type` to narrow it and fail closed on a wrong route.
type Handler = (schema: KnownSchema, walk: Walk) => z.core.$ZodType;

const strictified = new WeakMap<z.core.$ZodType, z.core.$ZodType>();
const inProgress = new WeakSet<z.core.$ZodType>();

// Copies property descriptors rather than values so getter-based fields
// (e.g. `defaultValue`) still produce a fresh value on every parse.
const overrideDef = <D extends object>(def: D, overrides: Partial<D>): D =>
  Object.defineProperties({} as D, {
    ...Object.getOwnPropertyDescriptors(def),
    ...Object.getOwnPropertyDescriptors(overrides)
  });

const cloneWith = (
  schema: KnownSchema,
  overrides: Partial<KnownDef>
): z.core.$ZodType =>
  z.core.clone(schema, overrideDef(schema._zod.def, overrides));

// Leaf types hold no nested schema: nothing to make strict.
const keep: Handler = (schema) => schema;

const rejectUnsupported: Handler = (schema) => {
  throw createError.internal(
    `strictifySchema: "${schema._zod.def.type}" schemas cannot be used in query or body schemas`
  );
};

// Only reachable if HANDLERS routes a type to the wrong handler.
const wrongHandler = (schema: KnownSchema): never => {
  throw createError.internal(
    `strictifySchema: wrong handler for "${schema._zod.def.type}" schemas`
  );
};

const strictifyObject: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'object') return wrongHandler(schema);

  // A loose or catchall object accepts unknown keys on purpose.
  if (def.catchall !== undefined && def.catchall._zod.def.type !== 'never') {
    throw createError.internal(
      'strictifySchema: loose or catchall objects cannot be used in query or body schemas; use z.record for dynamic keys'
    );
  }

  const shape = Object.fromEntries(
    Object.entries(def.shape).map(([key, value]) => [
      key,
      strictify(value, walk)
    ])
  );

  return cloneWith(schema, { shape, catchall: z.never() });
};

const strictifyInner: Handler = (schema, walk) => {
  const def = schema._zod.def;

  return 'innerType' in def
    ? cloneWith(schema, { innerType: strictify(def.innerType, walk) })
    : wrongHandler(schema);
};

const strictifyArray: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'array') return wrongHandler(schema);

  return cloneWith(schema, { element: strictify(def.element, walk) });
};

const strictifyPipe: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'pipe') return wrongHandler(schema);

  return cloneWith(schema, {
    in: strictify(def.in, walk),
    out: strictify(def.out, walk)
  });
};

const strictifyUnion: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'union') return wrongHandler(schema);

  return cloneWith(schema, {
    options: def.options.map((option) => strictify(option, walk))
  });
};

const strictifyTuple: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'tuple') return wrongHandler(schema);

  return cloneWith(schema, {
    items: def.items.map((item) => strictify(item, walk)),
    rest: def.rest === null ? null : strictify(def.rest, walk)
  });
};

const strictifyRecord: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'record') return wrongHandler(schema);

  // A loose record keeps keys outside its key schema on purpose.
  if (def.mode === 'loose') {
    throw createError.internal(
      'strictifySchema: loose records cannot be used in query or body schemas; use z.record with a key schema that covers every key'
    );
  }

  return cloneWith(schema, { valueType: strictify(def.valueType, walk) });
};

const strictifyLazy: Handler = (schema, walk) => {
  const def = schema._zod.def;
  if (def.type !== 'lazy') return wrongHandler(schema);

  const inner = strictify(def.getter(), walk);

  return cloneWith(schema, { getter: () => inner });
};

// Exhaustive on purpose: a type added by a future Zod release fails the build
// instead of silently keeping its nested objects non-strict.
const HANDLERS: Record<KnownDef['type'], Handler> = {
  // Containers
  object: strictifyObject,
  optional: strictifyInner,
  nullable: strictifyInner,
  default: strictifyInner,
  prefault: strictifyInner,
  nonoptional: strictifyInner,
  readonly: strictifyInner,
  success: strictifyInner,
  array: strictifyArray,
  pipe: strictifyPipe,
  union: strictifyUnion,
  tuple: strictifyTuple,
  record: strictifyRecord,
  lazy: strictifyLazy,
  // Leaves
  string: keep,
  number: keep,
  bigint: keep,
  boolean: keep,
  date: keep,
  symbol: keep,
  undefined: keep,
  null: keep,
  any: keep,
  unknown: keep,
  never: keep,
  void: keep,
  literal: keep,
  enum: keep,
  template_literal: keep,
  nan: keep,
  file: keep,
  custom: keep,
  transform: keep,
  // `.catch()` swaps any invalid input (unknown keys included) for a fallback;
  // an intersection hides unknown keys; the rest cannot come from a JSON body
  // or a query string. `.catch()` is rejected even on leaves: request input
  // must fail loudly, never be replaced.
  catch: rejectUnsupported,
  intersection: rejectUnsupported,
  map: rejectUnsupported,
  set: rejectUnsupported,
  promise: rejectUnsupported,
  function: rejectUnsupported
};

// Never falls back to the non-strict original: a missing result fails closed.
const resolveStrictified = (schema: z.core.$ZodType): z.core.$ZodType => {
  const resolved = strictified.get(schema);
  if (resolved) return resolved;

  throw createError.internal(
    'strictifySchema: recursive schema was not strictified'
  );
};

function strictify(schema: z.core.$ZodType, walk: Walk): z.core.$ZodType {
  const cached = strictified.get(schema);
  if (cached) return cached;

  // A recursive schema reached itself: resolve it once the walk is done.
  if (inProgress.has(schema)) {
    return z.lazy(() => resolveStrictified(schema));
  }

  // Every first-party Zod schema is a member of the `$ZodTypes` union.
  const known = schema as KnownSchema;
  // A schema outside that union (third-party) has no own entry: fail closed.
  // `Object.hasOwn` keeps inherited keys such as `constructor` from matching.
  const type = known._zod.def.type;
  if (!Object.hasOwn(HANDLERS, type)) return rejectUnsupported(known, walk);
  const handler = HANDLERS[type];

  inProgress.add(schema);
  try {
    const result = handler(known, walk);
    strictified.set(schema, result);
    // A strict result maps to itself, so strictifying it again is a no-op.
    strictified.set(result, result);
    walk.entries.push(schema, result);
    return result;
  } finally {
    inProgress.delete(schema);
  }
}

/**
 * Returns a copy of `schema` where every object, at any depth, rejects
 * unknown keys. Results are memoised per schema instance and strictifying a
 * result again returns it unchanged. Throws an internal error for `.catch()`,
 * intersections and loose or catchall objects and records, which would hide
 * or accept unknown keys, and for maps, sets, promises and functions, which
 * cannot come from a JSON body or a query string.
 */
export const strictifySchema = <T extends z.ZodType>(schema: T): T => {
  const walk: Walk = { entries: [] };
  try {
    // Clones keep the classic constructor of the original schema.
    return strictify(schema, walk) as T;
  } catch (error) {
    // A sub-schema cached before the failure may point back to the schema that
    // failed; keeping it would defer the failure from start-up to a request.
    for (const entry of walk.entries) strictified.delete(entry);
    throw error;
  }
};
