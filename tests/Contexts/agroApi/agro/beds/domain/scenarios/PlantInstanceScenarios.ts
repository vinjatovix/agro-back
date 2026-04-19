import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';

export const PlantInstanceScenarios = {
  seeded: (overrides = {}) =>
    PlantInstanceMother.create({
      status: 'seeded',
      ...overrides
    }),

  planted: (overrides = {}) =>
    PlantInstanceMother.create({
      status: 'planted',
      ...overrides
    }),

  growing: (overrides = {}) =>
    PlantInstanceMother.create({
      status: 'growing',
      ...overrides
    }),

  harvested: (overrides = {}) =>
    PlantInstanceMother.create({
      status: 'harvested',
      ...overrides
    })
};
