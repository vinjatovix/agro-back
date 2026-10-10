import { ListUserBeds } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('ListUserBeds', () => {
  let repository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let useCase: ListUserBeds;

  beforeEach(() => {
    repository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    useCase = new ListUserBeds({
      bedRepository: repository,
      plantInstanceRepository
    });
  });

  it('should call repository.findByUser and batch resolve crops', async () => {
    const userId = randomUserId();
    const bed1 = BedFactory.create({ userId });
    const bed2 = BedFactory.create({ userId });
    repository.addToStorage(bed1);
    repository.addToStorage(bed2);

    const crop1 = PlantInstanceMother.create({ userId, bedId: bed1.id });
    const crop2 = PlantInstanceMother.create({ userId, bedId: bed2.id });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const result = await useCase.execute(userId);

    expect(result.map(({ bed, cropIds }) => [bed.id, cropIds])).toEqual(
      expect.arrayContaining([
        [bed1.id, [crop1.id]],
        [bed2.id, [crop2.id]]
      ])
    );
    expect(result.every(({ crops }) => crops === undefined)).toBe(true);
  });

  it('should embed each bed its own full crops when asked to', async () => {
    const userId = randomUserId();
    const bed1 = BedFactory.create({ userId });
    const bed2 = BedFactory.create({ userId });
    repository.addToStorage(bed1);
    repository.addToStorage(bed2);
    const crop1 = PlantInstanceMother.create({ userId, bedId: bed1.id });
    plantInstanceRepository.addToStorage(crop1);

    const result = await useCase.execute(userId, { embedCrops: true });

    const byBed = new Map(result.map(({ bed, crops }) => [bed.id, crops]));
    expect(byBed.get(bed1.id)?.map((c) => c.id)).toEqual([crop1.id]);
    expect(byBed.get(bed2.id)).toEqual([]);
  });

  it('should return an empty list without loading crops when the user has no beds', async () => {
    const result = await useCase.execute(randomUserId());

    expect(result).toEqual([]);
  });
});
