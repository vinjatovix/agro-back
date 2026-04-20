import { UpdatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/UpdatePlant.js';
import { Plant } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/Plant.js';
import { PlantLifecycle } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantLifecycicle.js';
import { PlantSowing } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/PlantSowing.js';
import { Metadata } from '../../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { MonthSet } from '../../../../../../../src/shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../../../src/shared/domain/value-objects/Range.js';
import { random } from '../../../../Auth/fixtures/shared/index.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';

describe('UpdatePlant use case', () => {
  let repository: PlantRepositoryMock;
  let useCase: UpdatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new UpdatePlant(repository);
  });

  it('should update plant name', async () => {
    const plant = Plant.create({
      id: random.uuid(),
      name: 'Old name',
      familyId: 'rosaceae',
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(10, 20),
        spread: new Range(5, 10)
      },
      sowing: PlantSowing.fromPrimitives({
        seedsPerHole: { min: 1, max: 2 },
        germinationDays: { min: 7, max: 14 },
        months: [1, 2],
        methods: {
          direct: { depthCm: { min: 1, max: 2 } }
        }
      }),
      floweringMonths: new MonthSet([3, 4]),
      harvestMonths: new MonthSet([5, 6]),
      spacingCm: new Range(10, 15),
      metadata: new Metadata({
        createdAt: new Date(),
        createdBy: 'test',
        updatedAt: new Date(),
        updatedBy: 'test'
      })
    });

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        name: 'New name'
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id);

    expect(updated.name).toBe('New name');
  });

  it('should update lifecycle and size partially', async () => {
    const plant = Plant.create({
      id: random.uuid(),
      name: 'Plant',
      familyId: 'rosaceae',
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(10, 20),
        spread: new Range(5, 10)
      },
      sowing: PlantSowing.fromPrimitives({
        seedsPerHole: { min: 1, max: 2 },
        germinationDays: { min: 7, max: 14 },
        months: [1, 2],
        methods: {
          direct: { depthCm: { min: 1, max: 2 } }
        }
      }),
      floweringMonths: new MonthSet([3, 4]),
      harvestMonths: new MonthSet([5, 6]),
      spacingCm: new Range(10, 15),
      metadata: new Metadata({
        createdAt: new Date(),
        createdBy: 'test',
        updatedAt: new Date(),
        updatedBy: 'test'
      })
    });

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        lifecycle: 'perennial',
        size: {
          height: { min: 20, max: 40 }
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id);

    expect(updated.lifecycle.getValue()).toBe('perennial');
    expect(updated.size.height.min).toBe(20);
    expect(updated.size.height.max).toBe(40);
    expect(updated.size.spread.min).toBe(5); // no tocado
    expect(updated.size.spread.max).toBe(10); // no tocado
  });

  it('should throw if plant does not exist', async () => {
    await expect(
      useCase.execute(
        {
          id: 'missing',
          name: 'X'
        },
        'user-1'
      )
    ).rejects.toThrow('Plant not found: missing');
  });
});
