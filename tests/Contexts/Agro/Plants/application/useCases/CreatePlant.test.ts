import { CreatePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import { FamilyRepositoryMock } from '../../../Families/__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../../Families/domain/mothers/FamilyScenarios.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('CreatePlant (use case)', () => {
  let repository: PlantRepositoryMock;
  let familyRepository: FamilyRepositoryMock;
  let useCase: CreatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    familyRepository = new FamilyRepositoryMock();
    useCase = new CreatePlant(repository, familyRepository);
  });

  it('should throw if plant already exists', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });

    repository.addToStorage(await useCase.execute(dto));

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should throw if repository exists returns true directly', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.tomato();

    jest.spyOn(repository, 'exists').mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should create and persist a plant', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });

    const plant = await useCase.execute(dto);

    expect(plant.id.value).toBe(dto.id);
    expect(plant.identity.name.primary).toBe(dto.identity.name.primary);

    const stored = await repository.findById(dto.id);

    expect(stored.id.value).toBe(plant.id.value);
    repository.assertSaveHasBeenCalledWith(plant);
  });

  it('should persist multiple plants independently', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto1 = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });
    const dto2 = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });

    await useCase.execute(dto1);
    await useCase.execute(dto2);

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
  });

  it('should NOT include scientificName when not provided', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });
    delete dto.identity.scientificName;

    const plant = await useCase.execute(dto);

    expect(plant.identity.scientificName).toBeUndefined();
  });

  it('should include optional fields when provided', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value,
      'identity.scientificName': 'Solanum lycopersicum'
    });

    const plant = await useCase.execute(dto);

    expect(plant.identity.scientificName).toBe(dto.identity.scientificName);

    expect(plant.identity.familyId).toBe(dto.identity.familyId);
  });

  it('should propagate repository save errors', async () => {
    const family = FamilyScenarios.domainBase();
    familyRepository.addToStorage(family);
    const dto = CreatePlantDtoMother.custom({
      'identity.familyId': family.id.value
    });

    repository.simulateSaveFailure();

    await expect(useCase.execute(dto)).rejects.toThrow('Save failed');
  });

  it('should throw if id is invalid uuid', async () => {
    const dto = CreatePlantDtoMother.custom({
      id: 'not-a-uuid'
    });

    await expect(useCase.execute(dto)).rejects.toThrow();
  });

  it('should throw if family does not exist', async () => {
    const dto = CreatePlantDtoMother.tomato();

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Family with id ${dto.identity.familyId} does not exist`
    );
  });
});
