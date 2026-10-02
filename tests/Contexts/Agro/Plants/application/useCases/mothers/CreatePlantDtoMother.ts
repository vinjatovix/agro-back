import type { CreatePlantDto } from '../../../../../../../src/Contexts/Agro/Plants/application/useCases/interfaces/index.js';
import type { PlantLifecycleValue } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantLifecycleValue.js';
import { buildPatch } from '../../../../../../shared/dto/buildPatch.js';
import { deepMerge } from '../../../../../../shared/dto/deepMerge.js';
import { random } from '../../../../../shared/fixtures/index.js';
import {
  ASTERACEAE_FAMILY_ID,
  SOLANACEAE_FAMILY_ID
} from '../../../domain/mothers/PlantIdentityBuilder.js';

const lifecycle = (): PlantLifecycleValue =>
  random.arrayElement(['annual', 'biennial', 'perennial']);

const range = (minA: number, maxA: number) => ({
  min: minA,
  max: maxA
});

const base = (): CreatePlantDto => ({
  id: random.uuid(),

  identity: {
    name: {
      primary: 'Tomato'
    },
    scientificName: 'Solanum lycopersicum',
    family: SOLANACEAE_FAMILY_ID
  },

  traits: {
    lifecycle: lifecycle(),

    size: {
      height: range(10, 100),
      spread: range(10, 30)
    },

    spacingCm: range(10, 20)
  },

  phenology: {
    sowing: {
      months: [3, 4],

      seedsPerHole: range(1, 3),

      germinationDays: range(7, 14),

      methods: {
        direct: {
          depthCm: range(1, 2)
        }
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
      depthCm: range(20, 60),
      spreadCm: range(30, 80)
    },
    soil: {
      ph: range(6, 7),
      availableDepthCm: range(30, 80)
    },
    light: { hoursMin: 6, type: 'full_sun' },
    propagation: { methods: {} }
  }
});

export class CreatePlantDtoMother {
  static tomato(): CreatePlantDto {
    return base();
  }

  static lettuce(): CreatePlantDto {
    const dto = base();

    return {
      ...dto,

      id: random.uuid(),

      identity: {
        name: { primary: 'Lettuce' },
        scientificName: 'Lactuca sativa',
        family: ASTERACEAE_FAMILY_ID
      },

      traits: {
        lifecycle: 'annual',
        size: {
          height: range(5, 20),
          spread: range(5, 15)
        },
        spacingCm: range(5, 10)
      },

      phenology: {
        ...dto.phenology,

        sowing: {
          ...dto.phenology.sowing,
          months: [2]
        },

        flowering: {
          months: [4]
        },

        harvest: {
          months: [5]
        }
      }
    };
  }

  static withOptionalFields(): CreatePlantDto {
    const dto = base();

    return {
      ...dto,

      identity: {
        ...dto.identity,
        name: { ...dto.identity.name, aliases: ['Tomatera'] }
      }
    };
  }

  /** A plant that never flowers and is not harvested. */
  static withoutFloweringNorHarvest(): CreatePlantDto {
    const dto = base();
    const {
      flowering: _flowering,
      harvest: _harvest,
      ...phenology
    } = dto.phenology;

    return { ...dto, phenology };
  }

  static custom(overrides: Record<string, unknown>): CreatePlantDto {
    const patch = buildPatch(overrides);
    const dto = structuredClone(base());

    return deepMerge(dto, patch);
  }
}
