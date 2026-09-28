import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantLifecycle.js';
import { PlantSowing } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.js';
import { plantDomainMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';
import { PlantFactory } from '../mothers/PlantFactory.js';
import { PlantKnowledgeBuilder } from '../mothers/PlantKnowledgeBuilder.js';

const randomFamilyIdValue = randomFamilyId();

const buildPlant = (version?: number) => {
  return new Plant({
    ...(version !== undefined && { version }),
    id: randomPlantId(),
    identity: {
      name: { primary: 'Tomato' },
      family: randomFamilyIdValue
    },
    traits: {
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: Range.single(10),
        spread: Range.single(20)
      },
      spacingCm: Range.single(15)
    },
    phenology: {
      sowing: new PlantSowing({
        seedsPerHole: Range.single(2),
        germinationDays: Range.single(10),
        months: new MonthSet([3, 4]),
        methods: {
          direct: {
            depthCm: Range.single(2)
          }
        }
      }),
      flowering: {
        months: new MonthSet([6, 7])
      },
      harvest: {
        months: new MonthSet([8, 9])
      }
    },
    knowledge: PlantKnowledge.empty(),
    metadata: Metadata.create('system'),
    status: PlantStatus.ACTIVE
  });
};

describe('Plant (aggregate root)', () => {
  it('should default the version to 0 when props have none', () => {
    const plant = buildPlant();

    expect(plant.version).toBe(0);
  });

  it('should keep the version given in props', () => {
    const plant = buildPlant(5);

    expect(plant.version).toBe(5);
  });

  it('should expose identity correctly', () => {
    const plant = buildPlant();

    expect(plant.identity.name.primary).toBe('Tomato');
    expect(plant.identity.family).toBe(randomFamilyIdValue);
  });

  it('should expose traits correctly', () => {
    const plant = buildPlant();

    expect(plant.traits.size.height.min).toBe(10);
    expect(plant.traits.spacingCm.min).toBe(15);
  });

  it('should expose phenology correctly', () => {
    const plant = buildPlant();

    expect(plant.phenology.sowing.methods.direct.depthCm.min).toBe(2);
    expect(plant.phenology.sowing.months.toArray()).toEqual([3, 4]);
  });

  it('should default knowledge to empty when not provided via create()', () => {
    const plant = Plant.create({
      id: randomPlantId(),
      identity: {
        name: { primary: 'Tomato' },
        family: randomFamilyIdValue
      },
      traits: {
        lifecycle: PlantLifecycle.from('annual'),
        size: {
          height: Range.single(10),
          spread: Range.single(20)
        },
        spacingCm: Range.single(15)
      },
      phenology: buildPlant().phenology,
      metadata: Metadata.create('system'),
      status: PlantStatus.ACTIVE
    });

    expect(plant.knowledge).toEqual(PlantKnowledge.empty());
  });

  it('should mark plant as deleted', () => {
    const plant = buildPlant();

    expect(plant.isDeleted()).toBe(false);

    plant.markAsDeleted();

    expect(plant.isDeleted()).toBe(true);
    expect(plant.deletedAt).toBeInstanceOf(Date);
  });

  it('should not change status if already deleted', () => {
    const plant = buildPlant();

    plant.markAsDeleted();
    const firstDeletedAt = plant.deletedAt;

    plant.markAsDeleted();

    expect(plant.status).toBe(PlantStatus.DELETED);
    expect(plant.deletedAt).toBe(firstDeletedAt);
  });

  it('should expose metadata correctly', () => {
    const plant = buildPlant();

    expect(plant.metadata).toBeDefined();
  });

  it('should default status to ACTIVE when not provided', () => {
    const plant = Plant.create({
      id: randomPlantId(),
      identity: {
        name: { primary: 'Tomato' },
        family: randomFamilyIdValue
      },
      traits: {
        lifecycle: PlantLifecycle.from('annual'),
        size: {
          height: Range.single(10),
          spread: Range.single(20)
        },
        spacingCm: Range.single(15)
      },
      phenology: buildPlant().phenology,
      metadata: Metadata.create('system')
    });

    expect(plant.status).toBe(PlantStatus.ACTIVE);
  });

  it('should not allow mutation of traits externally', () => {
    const plant = buildPlant();

    const original = plant.traits.size.height.min;

    const attempt = () => {
      (plant.traits.size.height as unknown as Record<string, number>).min = 999;
    };

    expect(attempt).toThrow();
    expect(plant.traits.size.height.min).toBe(original);
  });

  it('should not allow inconsistent state if ACTIVE but deletedAt is provided', () => {
    const deletedAt = new Date();

    expect(
      () =>
        new Plant({
          id: randomPlantId(),
          identity: {
            name: { primary: 'Tomato' },
            family: randomFamilyIdValue
          },
          traits: {
            lifecycle: PlantLifecycle.from('annual'),
            size: {
              height: Range.single(10),
              spread: Range.single(20)
            },
            spacingCm: Range.single(15)
          },
          phenology: buildPlant().phenology,
          knowledge: PlantKnowledge.empty(),
          metadata: Metadata.create('system'),
          status: PlantStatus.ACTIVE,
          deletedAt
        })
    ).toThrow(InvalidArgumentException);
  });

  it('should allow DELETED plant without deletedAt only if set via markAsDeleted', () => {
    const plant = buildPlant();

    plant.markAsDeleted();

    expect(plant.status).toBe(PlantStatus.DELETED);
    expect(plant.deletedAt).toBeInstanceOf(Date);
  });

  it('should not allow Plant.create with DELETED status and no deletedAt', () => {
    expect(() => {
      Plant.create({
        id: randomPlantId(),
        identity: {
          name: { primary: 'Tomato' },
          family: randomFamilyIdValue
        },
        traits: {
          lifecycle: PlantLifecycle.from('annual'),
          size: {
            height: Range.single(10),
            spread: Range.single(20)
          },
          spacingCm: Range.single(15)
        },
        phenology: buildPlant().phenology,
        metadata: Metadata.create('system'),
        status: PlantStatus.DELETED
      });
    }).toThrow(InvalidArgumentException);
  });
});

describe('Plant mutation methods', () => {
  const assertUnchanged = (
    plant: Plant,
    before: ReturnType<typeof plantDomainMapper.toPrimitives>
  ) => {
    expect(plantDomainMapper.toPrimitives(plant)).toEqual(before);
  };

  describe('updateIdentity', () => {
    it('should trim and replace name.primary', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity({ name: { primary: '  Tomate  ' } });

      expect(plant.identity.name.primary).toBe('Tomate');
    });

    it('should trim aliases and drop empty ones', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity({
        name: { aliases: [' tomatera ', '  ', 'cherry'] }
      });

      expect(plant.identity.name.aliases).toEqual(['tomatera', 'cherry']);
    });

    it('should replace scientificName trimmed', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity({ scientificName: '  Solanum lycopersicum  ' });

      expect(plant.identity.scientificName).toBe('Solanum lycopersicum');
    });

    it('should throw InvalidArgumentException when name.primary is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() => plant.updateIdentity({ name: { primary: '   ' } })).toThrow(
        /primary/
      );
      assertUnchanged(plant, before);
    });

    it('should throw InvalidArgumentException when scientificName is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() => plant.updateIdentity({ scientificName: '   ' })).toThrow(
        /scientificName/
      );
      assertUnchanged(plant, before);
    });

    it('should replace family via createFamilyId', () => {
      const plant = PlantFactory.create();
      const newFamilyId = randomFamilyId();

      plant.updateIdentity({ family: newFamilyId });

      expect(plant.identity.family).toBe(newFamilyId);
    });

    it('should trim family before replacing it', () => {
      const plant = PlantFactory.create();
      const newFamilyId = randomFamilyId();

      plant.updateIdentity({ family: `  ${newFamilyId}  ` });

      expect(plant.identity.family).toBe(newFamilyId);
    });

    it('should throw InvalidArgumentException when family is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() => plant.updateIdentity({ family: '   ' })).toThrow(/family/);
      assertUnchanged(plant, before);
    });

    it('should keep props frozen after the change', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity({ name: { primary: 'New' } });

      expect(Object.isFrozen(plant.identity)).toBe(true);
      expect(Object.isFrozen(plant.identity.name)).toBe(true);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() => plant.updateIdentity({ name: { primary: 'New' } })).toThrow(
        DomainConflictException
      );
    });

    it('should not change id, version, metadata, status, deletedAt', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updateIdentity({ name: { primary: 'New Name' } });

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.id).toBe(before.id);
      expect(after.version).toBe(before.version);
      expect(after.metadata).toEqual(before.metadata);
      expect(after.status).toBe(before.status);
    });
  });

  describe('updateTraits', () => {
    it('should replace lifecycle', () => {
      const plant = PlantFactory.create();

      plant.updateTraits({ lifecycle: 'perennial' });

      expect(plant.traits.lifecycle.getValue()).toBe('perennial');
    });

    it('should merge spacingCm keeping existing max when only min given', () => {
      const plant = PlantFactory.create();
      const originalMax = plant.traits.spacingCm.max;

      plant.updateTraits({ spacingCm: { min: 5 } });

      expect(plant.traits.spacingCm.min).toBe(5);
      expect(plant.traits.spacingCm.max).toBe(originalMax);
    });

    it('should merge size.height keeping existing values', () => {
      const plant = PlantFactory.create();
      const originalSpread = plant.traits.size.spread.min;

      plant.updateTraits({ size: { height: { min: 20, max: 40 } } });

      expect(plant.traits.size.height.min).toBe(20);
      expect(plant.traits.size.height.max).toBe(40);
      expect(plant.traits.size.spread.min).toBe(originalSpread);
    });

    it('should throw when min > max for spacingCm', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updateTraits({ spacingCm: { min: 100, max: 1 } })
      ).toThrow(/greater/);
      assertUnchanged(plant, before);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() => plant.updateTraits({ lifecycle: 'annual' })).toThrow(
        DomainConflictException
      );
    });

    it('should not change id, version, metadata on success', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updateTraits({ lifecycle: 'perennial' });

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.id).toBe(before.id);
      expect(after.version).toBe(before.version);
      expect(after.metadata).toEqual(before.metadata);
    });
  });

  describe('updatePhenology', () => {
    it('should replace sowing months and keep other sowing fields', () => {
      const plant = PlantFactory.create();
      const originalGermination =
        plant.phenology.sowing.germinationDays.toPrimitives();

      plant.updatePhenology({ sowing: { months: [6, 7] } });

      expect(plant.phenology.sowing.months.toArray()).toEqual([6, 7]);
      expect(plant.phenology.sowing.germinationDays.toPrimitives()).toEqual(
        originalGermination
      );
    });

    it('should throw for invalid month', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() => plant.updatePhenology({ sowing: { months: [13] } })).toThrow(
        /13/
      );
      assertUnchanged(plant, before);
    });

    it('should build starter depthCm from a full range when absent', () => {
      const plant = PlantFactory.create();

      plant.updatePhenology({
        sowing: {
          methods: { starter: { depthCm: { min: 1, max: 3 } } }
        }
      });

      expect(plant.phenology.sowing.methods.starter?.depthCm.min).toBe(1);
    });

    it('should merge starter depthCm when present', () => {
      const plant = PlantFactory.tomato();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology({
        sowing: { methods: { starter: { depthCm: { max: 4 } } } }
      });

      expect(
        plant.phenology.sowing.methods.starter?.depthCm.toPrimitives()
      ).toEqual({
        min: before.phenology.sowing.methods.starter!.depthCm.min,
        max: 4
      });
    });

    it('should reject a partial starter depthCm when starter is absent', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology({
          sowing: { methods: { starter: { depthCm: { max: 3 } } } }
        })
      ).toThrow(InvalidArgumentException);
      assertUnchanged(plant, before);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() => plant.updatePhenology({ sowing: { months: [3] } })).toThrow(
        DomainConflictException
      );
    });

    it('should not change flowering and harvest when only sowing is updated', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology({ sowing: { months: [5] } });

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.phenology.flowering).toEqual(before.phenology.flowering);
      expect(after.phenology.harvest).toEqual(before.phenology.harvest);
    });
  });

  describe('updateKnowledge', () => {
    it('should delegate to PlantKnowledge.update', () => {
      const plant = PlantFactory.create({
        knowledge: PlantKnowledgeBuilder.full()
      });

      plant.updateKnowledge({ notes: ['new note'] });

      expect(plant.knowledge?.notes).toEqual(['new note']);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() => plant.updateKnowledge({ notes: ['note'] })).toThrow(
        DomainConflictException
      );
    });
  });
});
