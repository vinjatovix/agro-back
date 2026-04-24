import { CreatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { GetPlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/GetPlant.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('GetPlant', () => {
  let repository: PlantRepositoryMock;
  let createPlant: CreatePlant;
  let getPlant: GetPlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    createPlant = new CreatePlant(repository);
    getPlant = new GetPlant(repository);
  });

  it('should return a plant when it exists', async () => {
    const dto = CreatePlantDtoMother.tomato();

    await createPlant.execute(dto);

    const result = await getPlant.execute(dto.id);

    expect(result.id).toBe(dto.id);
    expect(result.identity.name.primary).toBe(dto.identity.name.primary);
    repository.assertFindByIdHasBeenCalledWith(dto.id);
  });

  it('should throw error when plant does not exist', async () => {
    await expect(getPlant.execute('non-existent')).rejects.toThrow(
      'Plant not found: non-existent'
    );

    repository.assertFindByIdHasBeenCalledWith('non-existent');
  });

  it('should call repository with correct id', async () => {
    const dto = CreatePlantDtoMother.lettuce();

    await createPlant.execute(dto);

    await getPlant.execute(dto.id);

    repository.assertFindByIdHasBeenCalledWith(dto.id);
  });
});
