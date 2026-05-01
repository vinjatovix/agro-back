import { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { PlantLifecycle } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantLifecycle.js';
import { PlantSowing } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../src/shared/domain/value-objects/Range.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';

const buildPlant = () => {
  return new Plant({
    id: UuidMother.random(),
    identity: {
      name: { primary: 'Tomato' },
      familyId: 'solanaceae'
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
  it('should expose identity correctly', () => {
    const plant = buildPlant();

    expect(plant.identity.name.primary).toBe('Tomato');
    expect(plant.identity.familyId).toBe('solanaceae');
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
      id: UuidMother.random(),
      identity: {
        name: { primary: 'Tomato' },
        familyId: 'solanaceae'
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
      id: UuidMother.random(),
      identity: {
        name: { primary: 'Tomato' },
        familyId: 'solanaceae'
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
          id: UuidMother.random(),
          identity: {
            name: { primary: 'Tomato' },
            familyId: 'solanaceae'
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
    ).toThrow('Active plant cannot have deletedAt');
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
        id: UuidMother.random(),
        identity: {
          name: { primary: 'Tomato' },
          familyId: 'solanaceae'
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
    }).toThrow();
  });
});
