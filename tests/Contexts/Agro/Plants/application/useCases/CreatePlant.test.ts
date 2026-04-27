import { CreatePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('CreatePlant (use case)', () => {
  let repository: PlantRepositoryMock;
  let useCase: CreatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new CreatePlant(repository);
  });

  it('should throw if plant already exists', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.addToStorage(await useCase.execute(dto));

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should throw if repository exists returns true directly', async () => {
    const dto = CreatePlantDtoMother.tomato();

    jest.spyOn(repository, 'exists').mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should create and persist a plant', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);

    expect(plant.id.value).toBe(dto.id);
    expect(plant.identity.name.primary).toBe(dto.identity.name.primary);

    const stored = await repository.findById(dto.id);

    expect(stored.id.value).toBe(plant.id.value);
    repository.assertSaveHasBeenCalledWith(plant);
  });

  it('should persist multiple plants independently', async () => {
    const dto1 = CreatePlantDtoMother.tomato();
    const dto2 = CreatePlantDtoMother.lettuce();

    await useCase.execute(dto1);
    await useCase.execute(dto2);

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
  });

  it('should NOT include scientificName when not provided', async () => {
    const dto = CreatePlantDtoMother.tomato();
    delete dto.identity.scientificName;

    const plant = await useCase.execute(dto);

    expect(plant.identity.scientificName).toBeUndefined();
  });

  it('should include optional fields when provided', async () => {
    const dto = CreatePlantDtoMother.withOptionalFields();

    const plant = await useCase.execute(dto);

    expect(plant.identity.scientificName).toBe(dto.identity.scientificName);

    expect(plant.identity.familyId).toBe(dto.identity.familyId);
  });

  it('should propagate repository save errors', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.simulateSaveFailure();

    await expect(useCase.execute(dto)).rejects.toThrow('Save failed');
  });

  it('should throw if id is invalid uuid', async () => {
    const dto = CreatePlantDtoMother.custom({
      id: 'not-a-uuid'
    });

    await expect(useCase.execute(dto)).rejects.toThrow();
  });
});
