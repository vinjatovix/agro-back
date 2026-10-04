import type {
  FamilyField,
  FamilyReadView,
  FamilySparseView
} from '../../../../../../src/Contexts/Agro/Families/application/queries/index.js';
import { toFamilyReadView } from '../../../../../../src/Contexts/Agro/Families/infrastructure/persistence/familyReadViewMapper.js';
import { FamilyScenarios } from '../../domain/mothers/FamilyScenarios.js';

/** Read views built from the family scenarios, the way storage holds them. */
export const FamilyReadViewMother = {
  base(): FamilyReadView {
    return toFamilyReadView(FamilyScenarios.mongoBase());
  },

  withExtra(): FamilyReadView {
    return toFamilyReadView(FamilyScenarios.mongoBaseWithExtra());
  },

  random(): FamilyReadView {
    return toFamilyReadView(FamilyScenarios.mongoRandom());
  },

  /**
   * `id` plus the selected fields of `view`, as a read with a fieldset; an
   * absent optional field stays absent.
   */
  sparse(
    view: FamilyReadView,
    fields: readonly FamilyField[]
  ): FamilySparseView {
    return Object.fromEntries([
      ['id', view.id],
      ...fields
        .filter((field) => view[field] !== undefined)
        .map((field) => [field, view[field]])
    ]) as FamilySparseView;
  },

  /** `FamilyExtra` rejects a species count below 1: no `Family` holds it. */
  breakingABusinessRule(): FamilyReadView {
    return toFamilyReadView(
      FamilyScenarios.mongoBaseWithExtra({ speciesCount: 0 })
    );
  }
};
