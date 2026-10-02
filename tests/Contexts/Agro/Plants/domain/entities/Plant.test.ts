import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPhenologyChanges } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPhenologyChanges.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { PollinationType } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import {
  PlantFlowering,
  PlantHarvest,
  PlantPhenology,
  PlantSowing
} from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/index.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantLifecycle.js';
import { plantDomainMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';
import { PlantFactory } from '../mothers/PlantFactory.js';
import {
  PlantIdentityBuilder,
  SOLANACEAE_FAMILY_ID
} from '../mothers/PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from '../mothers/PlantKnowledgeBuilder.js';

const buildPlant = (version?: number) => {
  return new Plant({
    ...(version !== undefined && { version }),
    id: randomPlantId(),
    identity: PlantIdentityBuilder.tomato(),
    traits: {
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: Range.single(10),
        spread: Range.single(20)
      },
      spacingCm: Range.single(15)
    },
    phenology: new PlantPhenology({
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
      flowering: new PlantFlowering({ months: new MonthSet([6, 7]) }),
      harvest: new PlantHarvest({ months: new MonthSet([8, 9]) })
    }),
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
    expect(plant.identity.family).toBe(SOLANACEAE_FAMILY_ID);
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

  it('should mark plant as deleted', () => {
    const plant = buildPlant();

    expect(plant.isDeleted()).toBe(false);

    plant.markAsDeleted('test-user');

    expect(plant.isDeleted()).toBe(true);
    expect(plant.deletedAt).toBeInstanceOf(Date);
  });

  it('should not change status if already deleted', () => {
    const plant = buildPlant();

    plant.markAsDeleted('test-user');
    const firstDeletedAt = plant.deletedAt;

    plant.markAsDeleted('test-user');

    expect(plant.status).toBe(PlantStatus.DELETED);
    expect(plant.deletedAt).toBe(firstDeletedAt);
  });

  it('should expose metadata correctly', () => {
    const plant = buildPlant();

    expect(plant.metadata).toBeDefined();
  });

  it('should default status to ACTIVE when not provided', () => {
    const plant = new Plant({
      id: randomPlantId(),
      identity: PlantIdentityBuilder.tomato(),
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
          identity: PlantIdentityBuilder.tomato(),
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

    plant.markAsDeleted('test-user');

    expect(plant.status).toBe(PlantStatus.DELETED);
    expect(plant.deletedAt).toBeInstanceOf(Date);
  });

  it('should not allow a DELETED plant without deletedAt', () => {
    expect(() => {
      new Plant({
        id: randomPlantId(),
        identity: PlantIdentityBuilder.tomato(),
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

      plant.updateIdentity({ name: { primary: '  Tomate  ' } }, 'test-user');

      expect(plant.identity.name.primary).toBe('Tomate');
    });

    it('should remove aliases on null', () => {
      const plant = PlantFactory.create();
      plant.updateIdentity({ name: { aliases: ['tomatera'] } }, 'test-user');

      plant.updateIdentity({ name: { aliases: null } }, 'test-user');

      expect(plant.identity.name).not.toHaveProperty('aliases');
    });

    it('should trim aliases and drop empty ones', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity(
        {
          name: { aliases: [' tomatera ', '  ', 'cherry'] }
        },
        'test-user'
      );

      expect(plant.identity.name.aliases).toEqual(['tomatera', 'cherry']);
    });

    it('should replace scientificName trimmed', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity(
        { scientificName: '  Solanum lycopersicum  ' },
        'test-user'
      );

      expect(plant.identity.scientificName).toBe('Solanum lycopersicum');
    });

    it('should throw InvalidArgumentException when name.primary is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updateIdentity({ name: { primary: '   ' } }, 'test-user')
      ).toThrow(/primary/);
      assertUnchanged(plant, before);
    });

    it('should throw InvalidArgumentException when scientificName is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updateIdentity({ scientificName: '   ' }, 'test-user')
      ).toThrow(/scientificName/);
      assertUnchanged(plant, before);
    });

    it('should replace family via createFamilyId', () => {
      const plant = PlantFactory.create();
      const newFamilyId = randomFamilyId();

      plant.updateIdentity({ family: newFamilyId }, 'test-user');

      expect(plant.identity.family).toBe(newFamilyId);
    });

    it('should trim family before replacing it', () => {
      const plant = PlantFactory.create();
      const newFamilyId = randomFamilyId();

      plant.updateIdentity({ family: `  ${newFamilyId}  ` }, 'test-user');

      expect(plant.identity.family).toBe(newFamilyId);
    });

    it('should throw InvalidArgumentException when family is empty after trim', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updateIdentity({ family: '   ' }, 'test-user')
      ).toThrow(/family/);
      assertUnchanged(plant, before);
    });

    it('should keep props frozen after the change', () => {
      const plant = PlantFactory.create();

      plant.updateIdentity({ name: { primary: 'New' } }, 'test-user');

      expect(Object.isFrozen(plant.identity)).toBe(true);
      expect(Object.isFrozen(plant.identity.name)).toBe(true);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() =>
        plant.updateIdentity({ name: { primary: 'New' } }, 'test-user')
      ).toThrow(DomainConflictException);
    });

    it('should not change id, version, created audit data, status, deletedAt', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updateIdentity({ name: { primary: 'New Name' } }, 'test-user');

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.id).toBe(before.id);
      expect(after.version).toBe(before.version);
      expect(after.metadata.createdAt).toEqual(before.metadata.createdAt);
      expect(after.metadata.createdBy).toBe(before.metadata.createdBy);
      expect(after.status).toBe(before.status);
      expect(after.deletedAt).toBe(before.deletedAt);
    });
  });

  describe('updateTraits', () => {
    it('should replace lifecycle', () => {
      const plant = PlantFactory.create();

      plant.updateTraits({ lifecycle: 'perennial' }, 'test-user');

      expect(plant.traits.lifecycle.getValue()).toBe('perennial');
    });

    it('should merge spacingCm keeping existing max when only min given', () => {
      const plant = PlantFactory.create();
      const originalMax = plant.traits.spacingCm.max;

      plant.updateTraits({ spacingCm: { min: 5 } }, 'test-user');

      expect(plant.traits.spacingCm.min).toBe(5);
      expect(plant.traits.spacingCm.max).toBe(originalMax);
    });

    it('should merge size.height keeping existing values', () => {
      const plant = PlantFactory.create();
      const originalSpread = plant.traits.size.spread.min;

      plant.updateTraits(
        { size: { height: { min: 20, max: 40 } } },
        'test-user'
      );

      expect(plant.traits.size.height.min).toBe(20);
      expect(plant.traits.size.height.max).toBe(40);
      expect(plant.traits.size.spread.min).toBe(originalSpread);
    });

    it('should throw when min > max for spacingCm', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updateTraits({ spacingCm: { min: 100, max: 1 } }, 'test-user')
      ).toThrow(/greater/);
      assertUnchanged(plant, before);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() =>
        plant.updateTraits({ lifecycle: 'annual' }, 'test-user')
      ).toThrow(DomainConflictException);
    });

    it('should not change id, version or created audit data on success', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updateTraits({ lifecycle: 'perennial' }, 'test-user');

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.id).toBe(before.id);
      expect(after.version).toBe(before.version);
      expect(after.metadata.createdAt).toEqual(before.metadata.createdAt);
      expect(after.metadata.createdBy).toBe(before.metadata.createdBy);
    });
  });

  describe('updatePhenology', () => {
    it('should replace sowing months and keep other sowing fields', () => {
      const plant = PlantFactory.create();
      const originalGermination =
        plant.phenology.sowing.germinationDays.toPrimitives();

      plant.updatePhenology({ sowing: { months: [6, 7] } }, 'test-user');

      expect(plant.phenology.sowing.months.toArray()).toEqual([6, 7]);
      expect(plant.phenology.sowing.germinationDays.toPrimitives()).toEqual(
        originalGermination
      );
    });

    it('should throw for invalid month', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology({ sowing: { months: [13] } }, 'test-user')
      ).toThrow(/13/);
      assertUnchanged(plant, before);
    });

    it('should build starter depthCm from a full range when absent', () => {
      const plant = PlantFactory.create();

      plant.updatePhenology(
        {
          sowing: {
            methods: { starter: { depthCm: { min: 1, max: 3 } } }
          }
        },
        'test-user'
      );

      expect(plant.phenology.sowing.methods.starter?.depthCm.min).toBe(1);
    });

    it('should merge starter depthCm when present', () => {
      const plant = PlantFactory.tomato();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology(
        {
          sowing: { methods: { starter: { depthCm: { max: 4 } } } }
        },
        'test-user'
      );

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
        plant.updatePhenology(
          {
            sowing: { methods: { starter: { depthCm: { max: 3 } } } }
          },
          'test-user'
        )
      ).toThrow(InvalidArgumentException);
      assertUnchanged(plant, before);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() =>
        plant.updatePhenology({ sowing: { months: [3] } }, 'test-user')
      ).toThrow(DomainConflictException);
    });

    it('should not change flowering and harvest when only sowing is updated', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology({ sowing: { months: [5] } }, 'test-user');

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.phenology.flowering).toEqual(before.phenology.flowering);
      expect(after.phenology.harvest).toEqual(before.phenology.harvest);
    });

    it('should update flowering months and keep other flowering fields', () => {
      const plant = PlantFactory.tomato();
      const originalPollination = plant.phenology.flowering.pollination;

      plant.updatePhenology({ flowering: { months: [7, 8] } }, 'test-user');

      expect(plant.phenology.flowering.months.toArray()).toEqual([7, 8]);
      expect(plant.phenology.flowering.pollination).toEqual(
        originalPollination
      );
    });

    it('should update flowering pollination types and agents', () => {
      const plant = PlantFactory.tomato();

      plant.updatePhenology(
        {
          flowering: {
            pollination: {
              types: [PollinationType.BIRD],
              agents: ['Hummingbird']
            }
          }
        },
        'test-user'
      );

      expect(plant.phenology.flowering.pollination).toEqual({
        types: [PollinationType.BIRD],
        agents: ['Hummingbird']
      });
    });

    it('should keep the pollination types when only agents are updated', () => {
      const plant = PlantFactory.tomato();
      const { types } = plant.phenology.flowering.pollination ?? {};

      plant.updatePhenology(
        { flowering: { pollination: { agents: ['Bumblebee'] } } },
        'test-user'
      );

      expect(plant.phenology.flowering.pollination).toEqual({
        types,
        agents: ['Bumblebee']
      });
    });

    it('should reject agents alone on a plant without pollination', () => {
      const plant = buildPlant();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology(
          { flowering: { pollination: { agents: ['Bee'] } } },
          'test-user'
        )
      ).toThrow(InvalidArgumentException);
      assertUnchanged(plant, before);
    });

    it.each([
      [
        'the pollination',
        { flowering: { pollination: null } },
        (p: Plant) => p.phenology.flowering.pollination
      ],
      [
        'the pollination agents',
        { flowering: { pollination: { agents: null } } },
        (p: Plant) => p.phenology.flowering.pollination?.agents
      ],
      [
        'the harvest description',
        { harvest: { description: null } },
        (p: Plant) => p.phenology.harvest.description
      ],
      [
        'the starter sowing method',
        { sowing: { methods: { starter: null } } },
        (p: Plant) => p.phenology.sowing.methods.starter
      ]
    ] satisfies Array<
      [string, PlantPhenologyChanges, (plant: Plant) => unknown]
    >)('should remove %s on null', (_, changes, read) => {
      const plant = PlantFactory.tomato();
      expect(read(plant)).toBeDefined();

      plant.updatePhenology(changes, 'test-user');

      expect(read(plant)).toBeUndefined();
    });

    it('should keep the pollination types when its agents are removed', () => {
      const plant = PlantFactory.tomato();
      const types = plant.phenology.flowering.pollination?.types;

      plant.updatePhenology(
        { flowering: { pollination: { agents: null } } },
        'test-user'
      );

      expect(plant.phenology.flowering.pollination).toEqual({ types });
    });

    it('should reject repeated pollination types', () => {
      const plant = PlantFactory.tomato();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology(
          {
            flowering: {
              pollination: {
                types: [PollinationType.INSECT, PollinationType.INSECT]
              }
            }
          },
          'test-user'
        )
      ).toThrow(InvalidArgumentException);
      assertUnchanged(plant, before);
    });

    it('should trim the harvest description', () => {
      const plant = PlantFactory.tomato();

      plant.updatePhenology(
        { harvest: { description: '  Pick when red  ' } },
        'test-user'
      );

      expect(plant.phenology.harvest.description).toBe('Pick when red');
    });

    it('should reject a blank harvest description', () => {
      const plant = PlantFactory.tomato();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology({ harvest: { description: '   ' } }, 'test-user')
      ).toThrow(InvalidArgumentException);
      assertUnchanged(plant, before);
    });

    it('should update harvest months and keep harvest description', () => {
      const plant = PlantFactory.tomato();
      const originalDescription = plant.phenology.harvest.description;

      plant.updatePhenology({ harvest: { months: [9, 10] } }, 'test-user');

      expect(plant.phenology.harvest.months.toArray()).toEqual([9, 10]);
      expect(plant.phenology.harvest.description).toBe(originalDescription);
    });

    it('should update harvest description and keep harvest months', () => {
      const plant = PlantFactory.tomato();
      const originalMonths = plant.phenology.harvest.months.toArray();

      plant.updatePhenology(
        { harvest: { description: 'Harvest when deep red' } },
        'test-user'
      );

      expect(plant.phenology.harvest.description).toBe('Harvest when deep red');
      expect(plant.phenology.harvest.months.toArray()).toEqual(originalMonths);
    });

    it('should not update metadata when flowering is unchanged', () => {
      const plant = PlantFactory.tomato();
      const currentMonths = plant.phenology.flowering.months.toArray();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology(
        { flowering: { months: currentMonths } },
        'test-user'
      );

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.metadata.updatedAt).toEqual(before.metadata.updatedAt);
    });

    it('should not update metadata when harvest is unchanged', () => {
      const plant = PlantFactory.tomato();
      const currentMonths = plant.phenology.harvest.months.toArray();
      const before = plantDomainMapper.toPrimitives(plant);

      plant.updatePhenology(
        { harvest: { months: currentMonths } },
        'test-user'
      );

      const after = plantDomainMapper.toPrimitives(plant);
      expect(after.metadata.updatedAt).toEqual(before.metadata.updatedAt);
    });

    it('should throw for invalid month in flowering', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology({ flowering: { months: [0] } }, 'test-user')
      ).toThrow(/0/);
      assertUnchanged(plant, before);
    });

    it('should throw for invalid month in harvest', () => {
      const plant = PlantFactory.create();
      const before = plantDomainMapper.toPrimitives(plant);

      expect(() =>
        plant.updatePhenology({ harvest: { months: [13] } }, 'test-user')
      ).toThrow(/13/);
      assertUnchanged(plant, before);
    });
  });

  describe('updateKnowledge', () => {
    it('should delegate to PlantKnowledge.update', () => {
      const plant = PlantFactory.create({
        knowledge: PlantKnowledgeBuilder.full()
      });

      plant.updateKnowledge({ notes: ['new note'] }, 'test-user');

      expect(plant.knowledge?.notes).toEqual(['new note']);
    });

    it('should throw DomainConflictException on a soft-deleted plant', () => {
      const plant = PlantFactory.create({ deletedAt: new Date() });

      expect(() =>
        plant.updateKnowledge({ notes: ['note'] }, 'test-user')
      ).toThrow(DomainConflictException);
    });
  });
});

describe('Plant audit metadata', () => {
  const OLD = new Date('2024-01-01T00:00:00.000Z');

  const auditedPlant = (): Plant =>
    plantDomainMapper.fromPrimitives({
      ...plantDomainMapper.toPrimitives(buildPlant()),
      metadata: {
        createdAt: OLD,
        createdBy: 'creator',
        updatedAt: OLD,
        updatedBy: 'creator'
      }
    });

  const expectAuditedBy = (plant: Plant, user: string): void => {
    expect(plant.metadata.updatedBy).toBe(user);
    expect(plant.metadata.updatedAt.getTime()).toBeGreaterThan(OLD.getTime());
    expect(plant.metadata.createdBy).toBe('creator');
    expect(plant.metadata.createdAt).toEqual(OLD);
  };

  it.each([
    [
      'updateIdentity',
      (p: Plant, user: string) =>
        p.updateIdentity({ name: { primary: 'Other' } }, user)
    ],
    [
      'updateTraits',
      (p: Plant, user: string) =>
        p.updateTraits({ lifecycle: 'perennial' }, user)
    ],
    [
      'updatePhenology',
      (p: Plant, user: string) =>
        p.updatePhenology({ sowing: { months: [5, 6] } }, user)
    ],
    [
      'updateKnowledge',
      (p: Plant, user: string) =>
        p.updateKnowledge({ notes: ['new note'] }, user)
    ]
  ])('%s with a real change refreshes audit data', (_name, mutate) => {
    const plant = auditedPlant();

    mutate(plant, 'editor');

    expectAuditedBy(plant, 'editor');
  });

  it.each([
    [
      'updateIdentity',
      (p: Plant, user: string) =>
        p.updateIdentity({ name: { primary: p.identity.name.primary } }, user)
    ],
    [
      'updateTraits',
      (p: Plant, user: string) =>
        p.updateTraits({ lifecycle: p.traits.lifecycle.getValue() }, user)
    ],
    [
      'updatePhenology',
      (p: Plant, user: string) =>
        p.updatePhenology(
          { sowing: { months: p.phenology.sowing.months.toArray() } },
          user
        )
    ],
    ['updateKnowledge', (p: Plant, user: string) => p.updateKnowledge({}, user)]
  ])('%s with the same values leaves the aggregate untouched', (_n, mutate) => {
    const plant = auditedPlant();
    const metadata = plant.metadata;
    const before = plantDomainMapper.toPrimitives(plant);

    mutate(plant, 'editor');

    expect(plant.metadata).toBe(metadata);
    expect(plantDomainMapper.toPrimitives(plant)).toEqual(before);
  });

  it('several sections in one request: last real change wins and no-op sections do not refresh audit', () => {
    const plant = auditedPlant();

    plant.updateIdentity({ name: { primary: 'Other' } }, 'first');
    plant.updateTraits({ lifecycle: 'perennial' }, 'second');
    const metadata = plant.metadata;
    plant.updateKnowledge({}, 'third');

    expectAuditedBy(plant, 'second');
    expect(plant.metadata).toBe(metadata);
  });

  it('invalid change leaves metadata untouched', () => {
    const plant = auditedPlant();
    const metadata = plant.metadata;

    expect(() =>
      plant.updateTraits({ spacingCm: { min: 100, max: 1 } }, 'editor')
    ).toThrow();
    expect(plant.metadata).toBe(metadata);
  });

  it('mutation on a deleted plant leaves metadata untouched', () => {
    const plant = auditedPlant();
    plant.markAsDeleted('deleter');
    const metadata = plant.metadata;

    expect(() =>
      plant.updateIdentity({ name: { primary: 'Other' } }, 'editor')
    ).toThrow(DomainConflictException);
    expect(plant.metadata).toBe(metadata);
  });

  it('markAsDeleted records the deleting user at the deletion time', () => {
    const plant = auditedPlant();

    plant.markAsDeleted('deleter');

    expectAuditedBy(plant, 'deleter');
    expect(plant.metadata.updatedAt).toBe(plant.deletedAt);
  });

  it('markAsDeleted on a deleted plant is a silent no-op that keeps metadata', () => {
    const plant = auditedPlant();
    plant.markAsDeleted('deleter');
    const metadata = plant.metadata;

    plant.markAsDeleted('someone-else');

    expect(plant.metadata).toBe(metadata);
  });

  describe('syncVersion', () => {
    it.each([
      ['written', 1],
      ['unchanged', 0]
    ] as const)(
      'applies a %s outcome as the current version + %i without touching metadata',
      (outcome, step) => {
        const plant = buildPlant(3);
        const metadata = plant.metadata;

        plant.syncVersion(outcome);

        expect(plant.version).toBe(3 + step);
        expect(plant.metadata).toBe(metadata);
      }
    );
  });
});
