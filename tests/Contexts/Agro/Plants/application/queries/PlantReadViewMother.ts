import type {
  PlantField,
  PlantReadView,
  PlantSparseView
} from '../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { toPlantReadView } from '../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.js';
import { plantPersistenceMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';
import { projectedPlantDocument } from '../../infrastructure/persistence/mongo/projectedPlantDocument.js';

/** Read views built from the plant factories, the way storage holds them. */
export const PlantReadViewMother = {
  from(plant: Plant): PlantReadView {
    return toPlantReadView(
      projectedPlantDocument(plantPersistenceMapper.toMongoDocument(plant))
    );
  },

  tomato(): PlantReadView {
    return this.from(PlantFactory.tomato());
  },

  random(): PlantReadView {
    return this.from(PlantFactory.random());
  },

  deleted(): PlantReadView {
    const plant = PlantFactory.random();
    plant.markAsDeleted('test-user');

    return this.from(plant);
  },

  /** `id` plus the selected fields of `view`, as a read with a fieldset. */
  sparse(view: PlantReadView, fields: readonly PlantField[]): PlantSparseView {
    return Object.fromEntries([
      ['id', view.id],
      ...fields.map((field) => [field, view[field]])
    ]) as PlantSparseView;
  },

  /** A plant of the family `familyId`. */
  ofFamily(familyId: string): PlantReadView {
    const view = this.random();

    return { ...view, identity: { ...view.identity, family: familyId } };
  },

  /** Breaks a `Range` rule (`min > max`): no `Plant` could hold it. */
  breakingABusinessRule(): PlantReadView {
    const view = this.random();

    return {
      ...view,
      traits: {
        ...view.traits,
        size: { ...view.traits.size, height: { min: 50, max: 10 } }
      }
    };
  }
};
