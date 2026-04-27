import { UpdatePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/index.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { plantMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantMapper.js';
import { random } from '../../../../shared/fixtures/index.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('UpdatePlant use case', () => {
  let repository: PlantRepositoryMock;
  let useCase: UpdatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new UpdatePlant(repository);
  });

  it('should update plant name', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        identity: {
          name: {
            primary: 'New name'
          }
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.identity.name.primary).toBe('New name');
  });

  it('should update lifecycle and size partially', async () => {
    const plant = PlantFactory.create();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        traits: {
          lifecycle: 'perennial',
          size: {
            height: { min: 20, max: 40 }
          }
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.traits.lifecycle.getValue()).toBe('perennial');
    expect(updated.traits.size.height.min).toBe(20);
    expect(updated.traits.size.height.max).toBe(40);

    expect(updated.traits.size.spread.min).toBe(plant.traits.size.spread.min);
  });

  it('should NOT overwrite untouched fields', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        identity: {
          name: { primary: 'New name' }
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.traits.size.height.min).toBe(plant.traits.size.height.min);
  });

  it('should update scientificName when provided', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        identity: {
          scientificName: 'New scientific name'
        }
      },
      'user-1'
    );

    const updated = await repository.findById(plant.id.value);

    expect(updated.identity.scientificName).toBe('New scientific name');
  });

  it('should send null to repository when clearing optional fields', async () => {
    const plant = PlantFactory.random();
    const current = plantMapper.toPrimitives(plant);
    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        identity: {
          scientificName: null
        }
      },
      'user-1'
    );

    repository.assertUpdateHasBeenCalledWith(
      current,
      expect.objectContaining({
        identity: expect.objectContaining({
          scientificName: null
        }) as Partial<PlantPrimitives>['identity']
      }) as Partial<PlantPrimitives>,
      'user-1'
    );
  });

  it('should throw if plant does not exist', async () => {
    const id = random.uuid();

    await expect(
      useCase.execute(
        {
          id
        },
        'user-1'
      )
    ).rejects.toThrow(`Plant not found: ${id}`);
  });

  it('should call repository.updateWithDiff with correct payload', async () => {
    const plant = PlantFactory.random();
    const current = plantMapper.toPrimitives(plant);

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id.value,
        identity: {
          name: { primary: 'Updated name' }
        }
      },
      'user-1'
    );

    repository.assertUpdateHasBeenCalledWith(
      current,
      expect.objectContaining({
        ...plantMapper.toPrimitives(plant),
        identity: expect.objectContaining({
          name: expect.objectContaining({
            primary: 'Updated name'
          }) as Partial<PlantPrimitives>['identity'] extends { name?: infer N }
            ? N
            : never
        }) as Partial<PlantPrimitives>['identity']
      }) as Partial<PlantPrimitives>,
      'user-1'
    );
  });
});
