/**
 * Safety facts about a plant. An absent key means "no data", never `false`.
 * Both may be `true`: an edible plant can have toxic parts (potato leaves).
 * `toxicityNotes` explains the hazard (parts, doses, whether cooking helps);
 * it may come without `toxic` when the hazard is too vague to flag.
 */
export type PlantEcologicalTraits = {
  edible?: boolean | undefined;
  toxic?: boolean | undefined;
  toxicityNotes?: string | undefined;
};

// PATCH semantics: an absent key is kept, `null` removes it.
export type PlantEcologicalTraitsChanges = {
  edible?: boolean | null;
  toxic?: boolean | null;
  toxicityNotes?: string | null;
};
