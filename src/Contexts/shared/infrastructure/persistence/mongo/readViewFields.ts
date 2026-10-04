/**
 * One mapper per read-view field: how a stored document gives that field.
 * Shared by the full view and the sparse view, so both apply the same
 * defaults.
 */
export type ReadViewFieldMappers<TDocument, TView> = {
  readonly [K in keyof TView]-?: (document: TDocument) => TView[K];
};

/** `id` plus any subset of the other fields of a read view. */
export type SparseView<TView extends { id: string }> = Pick<TView, 'id'> &
  Partial<Omit<TView, 'id'>>;

/**
 * Maps only `id` and the selected fields of a document read with a narrowed
 * projection. A field whose mapper yields `undefined` (an absent optional
 * field) is left out, never sent as `null`.
 */
export const toSparseView = <
  TDocument,
  TView extends { id: string },
  K extends keyof TView
>(
  mappers: ReadViewFieldMappers<TDocument, TView>,
  document: TDocument,
  fields: readonly K[]
): SparseView<TView> => {
  const view: Partial<TView> = {};

  for (const field of fields) {
    if (field === 'id') continue;
    const value = mappers[field](document);
    if (value !== undefined) view[field] = value;
  }

  return { ...view, id: mappers.id(document) };
};
