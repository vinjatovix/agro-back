import { CreateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/CreateBed.js';
import { bedMapper } from '../../../../../../src/Contexts/Agro/Beds/mappers/bedMapper.js';
import { createError } from '../../../../../../src/shared/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';

describe('CreateBed', () => {
  let repository: BedRepositoryMock;
  let useCase: CreateBed;
  const USER_NAME = random.name();
  const USER_ID = UuidMother.random().value;
  const BED_NAME = 'Test Bed';

  const BED_UUID = UuidMother.random();
  const input = {
    id: BED_UUID.value,
    userId: USER_ID,
    name: BED_NAME,
    width: 100,
    height: 200,
    depth: 30
  };

  beforeEach((): void => {
    repository = new BedRepositoryMock();
    useCase = new CreateBed(repository);
  });

  it('should throw conflict if bed already exists', async () => {
    const bed = bedMapper.fromCreateInputToDomain(input, USER_NAME);
    repository.addToStorage(bed);

    await expect(useCase.execute(input, USER_NAME)).rejects.toEqual(
      createError.conflict(`Bed already exists: ${input.id}`)
    );

    repository.assertSaveNotCalled();
  });

  it('should save bed in repository', async () => {
    await useCase.execute(input, USER_NAME);

    repository.assertSaveCalled();
  });

  it('should return created bed', async () => {
    const result = await useCase.execute(input, USER_NAME);

    expect(result.id.value).toBe(BED_UUID.value);
    expect(result.userId.value).toBe(USER_ID);
    expect(result.width.value).toBe(input.width);
    expect(result.height.value).toBe(input.height);
    expect(result.depth.value).toBe(input.depth);
  });

  it('should call exists before anything else', async () => {
    await useCase.execute(input, USER_NAME);

    repository.assertExistsCalledWith(input.id);
  });
});
