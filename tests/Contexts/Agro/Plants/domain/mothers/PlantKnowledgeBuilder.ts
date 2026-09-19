import type { PlantLightPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantLightPrimitives.js';
import type { PruningTypePrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PruningPrimitves.js';
import type { Seasons } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/Seasons.js';
import type { WateringFrequency } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/WateringFrequency.js';

import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { RootSystem } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/RootSystem.js';
import { SoilProfile } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/SoilProfile.js';

import { random } from '../../../../shared/fixtures/random.js';

const baseSoil = (
  phMin: number,
  phMax: number,
  depthMin: number,
  depthMax: number
) =>
  SoilProfile.fromPrimitives({
    ph: { min: phMin, max: phMax },
    availableDepthCm: { min: depthMin, max: depthMax }
  });

const baseRoot = (
  type: 'fibrous' | 'deep' | 'taproot',
  depthMin: number,
  depthMax: number,
  spreadMin: number,
  spreadMax: number
) =>
  RootSystem.fromPrimitives({
    type,
    depthCm: { min: depthMin, max: depthMax },
    spreadCm: { min: spreadMin, max: spreadMax }
  });

const baseTomatoLikeKnowledge = () => ({
  soil: baseSoil(6, 7, 30, 80),

  rootSystem: baseRoot('fibrous', 20, 60, 30, 80),

  watering: {
    frequency: 'weekly' as WateringFrequency,
    conditions: ['normal soil']
  },

  light: {
    hoursMin: 6,
    type: 'full_sun' as const,
    preference: 'morning' as const
  },

  pruning: [
    {
      type: 'maintenance' as const,
      intensity: 'light' as const,
      season: 'spring' as Seasons,
      frequencyPerYear: 2,
      bestPractices: ['clean cuts']
    }
  ],

  propagation: {
    methods: {
      seed: {
        season: 'spring' as Seasons,
        bestPractices: ['keep moist soil']
      }
    }
  },

  ecology: {
    strategicBenefits: ['soil improvement']
  },

  resources: [
    {
      type: 'article',
      url: 'https://example.com',
      title: 'Growing guide'
    }
  ],

  notes: ['robust plant']
});

export const PlantKnowledgeBuilder = {
  empty(): PlantKnowledge {
    return PlantKnowledge.empty();
  },

  minimal(): PlantKnowledge {
    return new PlantKnowledge({});
  },

  full(): PlantKnowledge {
    return new PlantKnowledge(baseTomatoLikeKnowledge());
  },

  random(): PlantKnowledge {
    const maybe = <T>(builder: () => T): T | undefined =>
      random.boolean() ? builder() : undefined;

    const soil = maybe(() =>
      SoilProfile.fromPrimitives({
        ph: {
          min: random.integer({ min: 5, max: 7 }),
          max: random.integer({ min: 7, max: 8 })
        },
        availableDepthCm: {
          min: random.integer({ min: 10, max: 30 }),
          max: random.integer({ min: 40, max: 100 })
        }
      })
    );

    const rootSystem = maybe(() =>
      RootSystem.fromPrimitives({
        type: random.arrayElement(['fibrous', 'deep', 'taproot']),
        depthCm: {
          min: random.integer({ min: 10, max: 50 }),
          max: random.integer({ min: 60, max: 120 })
        },
        spreadCm: {
          min: random.integer({ min: 20, max: 60 }),
          max: random.integer({ min: 70, max: 150 })
        }
      })
    );

    const watering = maybe(() => {
      const base: {
        frequency: WateringFrequency;
        conditions?: string[];
      } = {
        frequency: random.arrayElement(['daily', 'weekly'])
      };

      if (random.boolean()) {
        base.conditions = [random.word({ min: 3, max: 8 })];
      }

      return base;
    });

    const light = maybe((): PlantLightPrimitives => {
      const base: PlantLightPrimitives = {
        hoursMin: random.integer({ min: 2, max: 10 }),
        type: random.arrayElement(['full_sun', 'partial_shade', 'full_shade'])
      };

      if (random.boolean()) {
        base.preference = random.arrayElement([
          'morning',
          'afternoon',
          'all_day'
        ]);
      }

      return base;
    });

    const pruning = maybe((): PruningTypePrimitives[] => [
      {
        type: random.arrayElement(['maintenance', 'rejuvenation', 'shaping']),
        intensity: random.arrayElement(['light', 'moderate', 'hard']),
        season: random.arrayElement([
          'spring',
          'summer',
          'autumn',
          'winter'
        ]) as Seasons,
        frequencyPerYear: random.integer({ min: 1, max: 4 }),
        ...(random.boolean()
          ? { bestPractices: [random.word({ min: 3, max: 8 })] }
          : {})
      }
    ]);

    const propagation = maybe(() => {
      const seed: {
        season?: Seasons;
        estimatedTimeWeeks?: { min: number; max: number };
        bestPractices?: string[];
      } = {};

      seed.estimatedTimeWeeks = {
        min: random.integer({ min: 1, max: 4 }),
        max: random.integer({ min: 5, max: 12 })
      };

      if (random.boolean()) {
        seed.season = random.arrayElement([
          'spring',
          'summer',
          'autumn',
          'winter'
        ]);
      }

      if (random.boolean()) {
        seed.bestPractices = [random.word({ min: 3, max: 8 })];
      }

      return {
        methods: { seed }
      };
    });

    const ecology = maybe(() => ({
      strategicBenefits: [random.word({ min: 3, max: 8 })]
    }));

    const resources = maybe(() => [
      {
        type: 'article',
        url: random.url(),
        title: random.description()
      }
    ]);

    const notes = maybe(() => [random.description()]);

    return new PlantKnowledge({
      ...(soil && { soil }),
      ...(rootSystem && { rootSystem }),
      ...(watering && { watering }),
      ...(light && { light }),
      ...(pruning && { pruning }),
      ...(propagation && { propagation }),
      ...(ecology && { ecology }),
      ...(resources && { resources }),
      ...(notes && { notes })
    });
  },

  tomato(): PlantKnowledge {
    return new PlantKnowledge(baseTomatoLikeKnowledge());
  },

  lettuce(): PlantKnowledge {
    return new PlantKnowledge({
      soil: baseSoil(6, 7.5, 20, 50),

      rootSystem: baseRoot('fibrous', 10, 30, 20, 40),

      watering: {
        frequency: 'weekly',
        conditions: ['well-drained soil']
      },

      light: {
        hoursMin: 4,
        type: 'partial_shade'
      },

      propagation: {
        methods: {
          seed: {
            season: 'spring',
            bestPractices: ['keep soil moist']
          }
        }
      },

      ecology: {
        strategicBenefits: ['quick growth']
      },

      resources: [
        {
          type: 'article',
          url: 'https://example.com/lettuce',
          title: 'Lettuce growing guide'
        }
      ],

      notes: ['prefers cooler temperatures']
    });
  }
};
