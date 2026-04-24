import { CreatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { ListPlants } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/ListPlants.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('ListPlants', () => {
  let repository: PlantRepositoryMock;
  let createPlant: CreatePlant;
  let listPlants: ListPlants;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    createPlant = new CreatePlant(repository);
    listPlants = new ListPlants(repository);
  });

  it('should return empty list when no plants exist', async () => {
    const result = await listPlants.execute();

    expect(result).toEqual([]);
  });

  it('should return all plants', async () => {
    const tomato = CreatePlantDtoMother.tomato();
    const lettuce = CreatePlantDtoMother.lettuce();

    await createPlant.execute(tomato);
    await createPlant.execute(lettuce);

    const result = await listPlants.execute();

    expect(result).toHaveLength(2);

    const ids = result.map((p) => p.id);

    expect(ids).toContain(tomato.id);
    expect(ids).toContain(lettuce.id);
  });

  it('should return plants in primitive format', async () => {
    const dto = CreatePlantDtoMother.tomato();

    await createPlant.execute(dto);

    const result = await listPlants.execute();

    expect(result[0]).toMatchObject({
      id: dto.id
    });
  });
});
