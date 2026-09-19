import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { PollinationType } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { PlantSowing } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';
import { random } from '../../../../shared/fixtures/random.js';

const month = () => random.integer({ min: 1, max: 12 });

export const PlantPhenologyBuilder = {
  generic(): PlantProps['phenology'] {
    return {
      sowing: new PlantSowing({
        seedsPerHole: new Range(1, 3),
        germinationDays: new Range(7, 14),
        months: new MonthSet([3]),
        methods: {
          direct: { depthCm: new Range(1, 2) }
        }
      }),
      flowering: {
        months: new MonthSet([6])
      },
      harvest: {
        months: new MonthSet([9])
      }
    };
  },

  random(): PlantProps['phenology'] {
    return {
      sowing: new PlantSowing({
        seedsPerHole: new Range(1, random.integer({ min: 2, max: 5 })),
        germinationDays: new Range(3, random.integer({ min: 10, max: 30 })),
        months: new MonthSet([month()]),
        methods: {
          direct: { depthCm: new Range(1, random.integer({ min: 5, max: 10 })) }
        }
      }),
      flowering: {
        months: new MonthSet([month(), month()])
      },
      harvest: {
        months: new MonthSet([month(), month()])
      }
    };
  },

  full(): PlantProps['phenology'] {
    return {
      sowing: new PlantSowing({
        seedsPerHole: new Range(1, random.integer({ min: 2, max: 5 })),
        germinationDays: new Range(3, random.integer({ min: 10, max: 30 })),
        months: new MonthSet([month(), month()]),
        methods: {
          direct: { depthCm: new Range(1, random.integer({ min: 2, max: 5 })) },
          starter: {
            depthCm: new Range(0, random.integer({ min: 1, max: 2 }))
          }
        }
      }),
      flowering: {
        months: new MonthSet([month(), month()]),
        pollination: {
          type: PollinationType.INSECT,
          agents: ['bees', 'butterflies']
        }
      },
      harvest: {
        months: new MonthSet([month(), month()]),
        description: 'Harvest when fruits are fully ripe.'
      }
    };
  },

  tomato(): PlantProps['phenology'] {
    return {
      sowing: new PlantSowing({
        seedsPerHole: new Range(1, 2),
        germinationDays: new Range(5, 10),
        months: new MonthSet([3, 4]),
        methods: {
          direct: { depthCm: new Range(1, 2) },
          starter: { depthCm: new Range(0, 1) }
        }
      }),
      flowering: {
        months: new MonthSet([6, 7]),
        pollination: {
          type: PollinationType.INSECT,
          agents: ['bees']
        }
      },
      harvest: {
        months: new MonthSet([8, 9]),
        description: 'Harvest when fruits are fully red.'
      }
    };
  },

  lettuce(): PlantProps['phenology'] {
    return {
      sowing: new PlantSowing({
        seedsPerHole: new Range(1, 3),
        germinationDays: new Range(7, 14),
        months: new MonthSet([2, 3]),
        methods: {
          direct: { depthCm: new Range(0.5, 1) }
        }
      }),
      flowering: {
        months: new MonthSet([5, 6])
      },
      harvest: {
        months: new MonthSet([4, 5]),
        description: 'Harvest when leaves are tender and before flowering.'
      }
    };
  }
};
