import { UpdatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/index.js';
import { PlantLifecycle } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/value-objects/index.js';
import { Range } from '../../../../../../../src/shared/domain/value-objects/index.js';
import { random } from '../../../../../shared/fixtures/index.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantMother } from '../../domain/mothers/PlantMother.js';

describe('UpdatePlant use case', () => {
  let repository: PlantRepositoryMock;
  let useCase: UpdatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new UpdatePlant(repository);
  });

  it('should update plant name', async () => {
    const plant = PlantMother.tomato();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        name: 'New name'
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.name).toBe('New name');
  });

  it('should update lifecycle and size partially', async () => {
    const plant = PlantMother.create({
      lifecycle: PlantLifecycle.from('annual'),
      size: {
        height: new Range(10, 20),
        spread: new Range(5, 10)
      }
    });

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        lifecycle: 'perennial',
        size: {
          height: { min: 20, max: 40 }
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.lifecycle.getValue()).toBe('perennial');
    expect(updated.size.height.min).toBe(20);
    expect(updated.size.height.max).toBe(40);
    expect(updated.size.spread.min).toBe(5); // no tocado
    expect(updated.size.spread.max).toBe(10); // no tocado
  });

  it('should NOT overwrite untouched fields', async () => {
    const plant = PlantMother.tomato();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        name: 'New name'
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.size.height.min).toBe(10); // still original
  });

  it('should update scientificName when provided', async () => {
    const plant = PlantMother.tomato();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        scientificName: 'New scientific name'
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.scientificName).toBe('New scientific name');
  });

  // TODO: add test for clearing optional fields when explicitly set to null
  // it('should allow clearing optional fields if explicitly set to null', async () => {
  //   const plant = Plant.create({
  //     id: UuidMother.random(),
  //     name: 'Plant',
  //     familyId: 'rosaceae',
  //     lifecycle: PlantLifecycle.from('annual'),
  //     size: {
  //       height: new Range(10, 20),
  //       spread: new Range(5, 10)
  //     },
  //     sowing: PlantSowing.fromPrimitives({
  //       seedsPerHole: { min: 1, max: 2 },
  //       germinationDays: { min: 7, max: 14 },
  //       months: [1, 2],
  //       methods: {
  //         direct: { depthCm: { min: 1, max: 2 } }
  //       }
  //     }),
  //     floweringMonths: new MonthSet([3, 4]),
  //     harvestMonths: new MonthSet([5, 6]),
  //     spacingCm: new Range(10, 15),
  //     scientificName: 'Original scientific name',
  //     metadata: Metadata.create('test')
  //   });

  //   repository.addToStorage(plant);

  //   await useCase.execute(
  //     {
  //       id: plant.id.value,
  //       scientificName: null
  //     },
  //     'user-1'
  //   );

  //   const updated = await repository.findById(plant.id.value);

  //   expect(updated.scientificName).toBeNull();
  // });

  it('should throw if plant does not exist', async () => {
    const id = random.uuid();
    await expect(
      useCase.execute(
        {
          id: id,
          name: 'X'
        },
        'user-1'
      )
    ).rejects.toThrow(`Plant not found: ${id}`);
  });
});
