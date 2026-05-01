import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';

export const PlantInstanceScenarios = {
  seeded: (overrides = {}) =>
    PlantInstanceMother.create({
      growthStatus: CropGrowthStatus.SEEDED,
      ...overrides
    }),

  planted: (overrides = {}) =>
    PlantInstanceMother.create({
      growthStatus: CropGrowthStatus.PLANTED,
      ...overrides
    }),

  growing: (overrides = {}) =>
    PlantInstanceMother.create({
      growthStatus: CropGrowthStatus.GROWING,
      ...overrides
    }),

  harvested: (overrides = {}) =>
    PlantInstanceMother.create({
      growthStatus: CropGrowthStatus.HARVESTED,
      ...overrides
    })
};
