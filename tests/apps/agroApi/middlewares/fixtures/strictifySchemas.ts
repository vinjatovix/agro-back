import { z } from 'zod';

/** Non-strict object used as the building block of every case below. */
export const leafObject = () => z.object({ name: z.string() });

export const validLeaf = (): { name: string } => ({ name: 'leaf' });

export const leafWithUnknown = (): Record<string, unknown> => ({
  ...validLeaf(),
  extra: 1
});

type WrapperCase = {
  schema: z.ZodType;
  valid: unknown;
  invalid: unknown;
  unknownPath: ReadonlyArray<PropertyKey>;
};

/** Every supported container holding a non-strict object at some depth. */
export const wrapperCases = (): Record<string, WrapperCase> => {
  const leaf = leafObject();

  return {
    'top-level object': {
      schema: leaf,
      valid: validLeaf(),
      invalid: leafWithUnknown(),
      unknownPath: []
    },
    'nested object': {
      schema: z.object({ inner: leaf }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    optional: {
      schema: z.object({ inner: leaf.optional() }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    nullable: {
      schema: z.object({ inner: leaf.nullable() }),
      valid: { inner: null },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    default: {
      schema: z.object({ inner: leaf.default(validLeaf()) }),
      valid: {},
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    prefault: {
      schema: z.object({ inner: leaf.prefault(validLeaf()) }),
      valid: {},
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    nonoptional: {
      schema: z.object({ inner: leaf.optional().nonoptional() }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    readonly: {
      schema: z.object({ inner: leaf.readonly() }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    success: {
      schema: z.object({ inner: z.success(leaf) }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    array: {
      schema: z.object({ items: z.array(leaf) }),
      valid: { items: [validLeaf()] },
      invalid: { items: [validLeaf(), leafWithUnknown()] },
      unknownPath: ['items', 1]
    },
    pipe: {
      schema: z.object({ inner: leaf.pipe(z.object({ name: z.string() })) }),
      valid: { inner: validLeaf() },
      invalid: { inner: leafWithUnknown() },
      unknownPath: ['inner']
    },
    'discriminated union': {
      schema: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), name: z.string() }),
        z.object({ kind: z.literal('b'), size: z.number() })
      ]),
      valid: { kind: 'a', name: 'x' },
      invalid: { kind: 'a', name: 'x', extra: 1 },
      unknownPath: []
    },
    tuple: {
      schema: z.object({ pair: z.tuple([z.string(), leaf], leaf) }),
      valid: { pair: ['x', validLeaf(), validLeaf()] },
      invalid: { pair: ['x', validLeaf(), leafWithUnknown()] },
      unknownPath: ['pair', 2]
    },
    'record value': {
      schema: z.object({ byId: z.record(z.string(), leaf) }),
      valid: { byId: { a: validLeaf() } },
      invalid: { byId: { a: leafWithUnknown() } },
      unknownPath: ['byId', 'a']
    }
  };
};

type TreeNode = { name: string; children?: TreeNode[] };

/** Recursive schema built with `z.lazy`. */
export const recursiveTreeSchema = (): z.ZodType<TreeNode> => {
  const tree: z.ZodType<TreeNode> = z.lazy(() =>
    z.object({ name: z.string(), children: z.array(tree).exactOptional() })
  );

  return tree;
};

type Category = { name: string; subcategories?: Category[] };

/** Recursive schema built with a getter, the form Zod 4 recommends. */
export const recursiveGetterSchema = (): z.ZodType<Category> => {
  const category = z.object({
    name: z.string(),
    get subcategories(): z.ZodExactOptional<z.ZodArray<typeof category>> {
      return z.array(category).exactOptional();
    }
  });

  return category;
};

/** Non-discriminated union of two objects. */
export const plainUnionSchema = () =>
  z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]);

/** Query-like schema with coercion, default and transform. */
export const transformingSchema = () =>
  z.object({
    limit: z.coerce.number(),
    page: z.number().default(1),
    tags: z.string().transform((value) => value.split(','))
  });

/** Object with an object-level refinement. */
export const refinedSchema = () =>
  z
    .object({ from: z.number(), to: z.number() })
    .refine(({ from, to }) => from <= to, { path: ['to'] });

export const passthroughSchema = () => z.looseObject({ name: z.string() });

export const looseRecordSchema = () =>
  z.object({ labels: z.looseRecord(z.enum(['a', 'b']), z.string()) });

export const catchallSchema = () =>
  z.object({ name: z.string() }).catchall(z.number());

export const withCatchSchema = () =>
  z.object({ inner: leafObject().catch(validLeaf()) });

export const withIntersectionSchema = () =>
  z.object({
    inner: z.intersection(leafObject(), z.object({ size: z.number() }))
  });

export const withSetSchema = () => z.object({ inner: z.set(leafObject()) });

export const withMapSchema = () =>
  z.object({ inner: z.map(z.string(), leafObject()) });

export const withPromiseSchema = () =>
  z.object({ inner: z.promise(leafObject()) });

/**
 * A schema whose `def.type` is not a first-party Zod type, as a third-party
 * schema would report. Used with names inherited from `Object.prototype` too.
 */
export const foreignTypeSchema = (type: string): z.ZodType => {
  const foreign = z.string();
  Object.assign(foreign._zod.def, { type });

  return z.object({ foreign });
};

/**
 * Two schemas that reach each other, where only the outer one holds an
 * unsupported `.catch()`. Strictifying `outer` walks `inner` before failing.
 */
export const failingRecursivePair = (): {
  outer: z.ZodType;
  inner: z.ZodType;
} => {
  const inner: z.ZodType = z.lazy(() => z.object({ outer: outer.optional() }));
  const outer: z.ZodType = z.object({
    inner,
    broken: z.string().catch('')
  });

  return { outer, inner };
};
