import { CreatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('CreatePlant', () => {
  let repository: PlantRepositoryMock;
  let useCase: CreatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new CreatePlant(repository);
  });

  it('should create and persist a plant', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);

    expect(plant.id).toBe(dto.id);
    expect(plant.name).toBe(dto.name);

    const stored = await repository.findById(dto.id);
    expect(stored.id).toBe(plant.id);

    repository.assertSaveHasBeenCalledWith(plant);
  });

  it('should throw if plant already exists', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.addToStorage(await useCase.execute(dto));

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should correctly map primitive fields into domain', async () => {
    const dto = CreatePlantDtoMother.lettuce();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives).toMatchObject({
      id: dto.id,
      name: dto.name,
      lifecycle: dto.lifecycle
    });
  });

  it('should include optional fields when provided', async () => {
    const dto = CreatePlantDtoMother.withOptionalFields();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives.scientificName).toBe(dto.scientificName);
    expect(primitives.familyId).toBe(dto.familyId);
  });

  it('should persist multiple plants independently', async () => {
    const dto1 = CreatePlantDtoMother.tomato();
    const dto2 = CreatePlantDtoMother.lettuce();

    await useCase.execute(dto1);
    await useCase.execute(dto2);

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
  });

  it('should propagate error when repository fails on save', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.simulateSaveFailure();

    await expect(useCase.execute(dto)).rejects.toThrow('Save failed');
  });

  it('should generate metadata internally', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives.metadata).toBeDefined();
    expect(primitives.metadata?.createdAt).toBeDefined();
    expect(primitives.metadata?.createdBy).toBeDefined();
    expect(primitives.metadata?.updatedAt).toBeDefined();
    expect(primitives.metadata?.updatedBy).toBeDefined();
  });
});
