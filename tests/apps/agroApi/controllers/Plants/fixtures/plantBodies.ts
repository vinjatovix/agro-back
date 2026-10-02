import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';

type Body = Record<string, unknown>;

export const buildMinimalCreatePlantBody = (overrides: Body = {}): Body => ({
  id: randomPlantId(),
  identity: {
    name: { primary: 'Tomato' },
    scientificName: 'Solanum lycopersicum',
    family: 'fam-solanaceae'
  },
  traits: {
    lifecycle: 'annual',
    size: {
      height: { min: 10, max: 100 },
      spread: { min: 10, max: 30 }
    },
    spacingCm: { min: 10, max: 20 }
  },
  phenology: {
    sowing: {
      months: [3, 4],
      seedsPerHole: { min: 1, max: 3 },
      germinationDays: { min: 7, max: 14 },
      methods: {
        direct: { depthCm: { min: 1, max: 2 } }
      }
    },
    flowering: {
      months: [6, 7]
    },
    harvest: {
      months: [8, 9]
    }
  },
  knowledge: {
    rootSystem: {
      type: 'fibrous',
      depthCm: { min: 10, max: 30 },
      spreadCm: { min: 10, max: 20 }
    },
    soil: {
      ph: { min: 6.0, max: 6.8 },
      availableDepthCm: { min: 30, max: 60 }
    },
    light: {
      hoursMin: 6,
      type: 'full_sun'
    },
    propagation: {
      methods: {
        seed: { seasons: ['spring'] }
      }
    }
  },
  ...overrides
});

export const buildPruningEntryBody = (overrides: Body = {}): Body => ({
  type: 'maintenance',
  intensity: 'light',
  seasons: ['summer'],
  frequencyPerYear: 4,
  bestPractices: ['Remove suckers'],
  ...overrides
});

export const buildResourceBody = (overrides: Body = {}): Body => ({
  type: 'article',
  url: 'https://example.com/tomato',
  ...overrides
});

export const buildFullCreatePlantBody = (overrides: Body = {}): Body => ({
  ...buildMinimalCreatePlantBody(),
  identity: {
    name: {
      primary: 'Tomato',
      aliases: ['Tomatera', 'Love Apple']
    },
    scientificName: 'Solanum lycopersicum',
    family: 'fam-solanaceae'
  },
  phenology: {
    sowing: {
      months: [3, 4],
      seedsPerHole: { min: 1, max: 3 },
      germinationDays: { min: 7, max: 14 },
      methods: {
        direct: { depthCm: { min: 1, max: 2 } },
        starter: { depthCm: { min: 0.5, max: 1 } }
      }
    },
    flowering: {
      months: [6, 7],
      pollination: {
        types: ['self', 'insect'],
        agents: ['bee', 'bumblebee']
      }
    },
    harvest: {
      months: [8, 9, 10],
      description: 'Harvest when fully red and slightly soft.'
    }
  },
  knowledge: {
    rootSystem: {
      type: 'taproot',
      depthCm: { min: 60, max: 120 },
      spreadCm: { min: 30, max: 60 }
    },
    soil: {
      ph: { min: 6.0, max: 6.8 },
      availableDepthCm: { min: 30, max: 60 }
    },
    light: {
      hoursMin: 8,
      type: 'full_sun',
      preference: 'morning'
    },
    propagation: {
      methods: {
        seed: {
          seasons: ['spring'],
          estimatedTimeWeeks: { min: 1, max: 2 },
          bestPractices: ['Sow indoors 6 weeks before the last frost']
        },
        rootCutting: { seasons: ['autumn', 'winter', 'spring'] }
      }
    },
    watering: {
      frequency: 'regular',
      conditions: ['dry surface']
    },
    pruning: [buildPruningEntryBody()],
    ecology: {
      strategicBenefits: ['attracts pollinators']
    },
    resources: [buildResourceBody()],
    notes: ['Stake early for best yields']
  },
  ...overrides
});
