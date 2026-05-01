import type { PlantLifecycleValue } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantLifecycleValue.js';
import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantLifecycle.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';
import { random } from '../../../../shared/fixtures/random.js';

export const PlantTraitsBuilder = {
  generic(): PlantProps['traits'] {
    return {
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(10, 50),
        spread: new Range(10, 50)
      },
      spacingCm: new Range(10, 20)
    };
  },

  random(): PlantProps['traits'] {
    return {
      lifecycle: PlantLifecycle.from(
        random.arrayElement([
          'annual',
          'perennial',
          'biennial'
        ]) as PlantLifecycleValue
      ),
      size: {
        height: new Range(
          random.integer({ min: 5, max: 100 }),
          random.integer({ min: 101, max: 300 })
        ),
        spread: new Range(
          random.integer({ min: 5, max: 100 }),
          random.integer({ min: 101, max: 300 })
        )
      },
      spacingCm: new Range(
        random.integer({ min: 5, max: 30 }),
        random.integer({ min: 31, max: 100 })
      )
    };
  },

  tomato(): PlantProps['traits'] {
    return {
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(50, 150),
        spread: new Range(50, 150)
      },
      spacingCm: new Range(30, 50)
    };
  },

  lettuce(): PlantProps['traits'] {
    return {
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(20, 40),
        spread: new Range(20, 40)
      },
      spacingCm: new Range(15, 25)
    };
  }
};
