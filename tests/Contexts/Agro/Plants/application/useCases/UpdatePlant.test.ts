import { UpdatePlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/index.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { plantDomainMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { ensureFound } from '../../../../../../src/Contexts/shared/application/utils/ensureFound.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/index.js';
import { FamilyRepositoryMock } from '../../../Families/__mocks__/FamilyRepositoryMock.js';
import { FamilyScenarios } from '../../../Families/domain/mothers/FamilyScenarios.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

describe('UpdatePlant use case', () => {
  const CURRENT_VERSION = 0;
  let repository: PlantRepositoryMock;
  let familyRepository: FamilyRepositoryMock;
  let useCase: UpdatePlant;

  const findExisting = async (id: string): Promise<Plant> =>
    ensureFound(await repository.findById(id), 'Plant', id);

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    familyRepository = new FamilyRepositoryMock();
    useCase = new UpdatePlant(repository, familyRepository);
  });

  it('should update plant name', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        identity: {
          name: {
            primary: 'New name'
          }
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    const updated = await findExisting(plant.id);

    expect(updated.identity.name.primary).toBe('New name');
  });

  it('should update lifecycle and size partially', async () => {
    const plant = PlantFactory.create();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        traits: {
          lifecycle: 'perennial',
          size: {
            height: { min: 20, max: 40 }
          }
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    const updated = await findExisting(plant.id);

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
        id: plant.id,
        identity: {
          name: { primary: 'New name' }
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    const updated = await findExisting(plant.id);

    expect(updated.traits.size.height.min).toBe(plant.traits.size.height.min);
  });

  it('should update scientificName when provided', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        identity: {
          scientificName: 'New scientific name'
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    const updated = await findExisting(plant.id);

    expect(updated.identity.scientificName).toBe('New scientific name');
  });

  it('should send null to repository when clearing optional fields', async () => {
    const plant = PlantFactory.random();
    const current = plantDomainMapper.toPrimitives(plant);
    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        identity: {
          scientificName: null
        }
      },
      'user-1',
      CURRENT_VERSION
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

  describe('optimistic concurrency', () => {
    const rename = (id: string, primary = 'New name') => ({
      id,
      identity: { name: { primary } }
    });

    it('should update and bump the stored version when expectedVersion matches', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);

      const updated = await useCase.execute(
        rename(plant.id),
        'user-1',
        plant.version
      );

      expect(updated.identity.name.primary).toBe('New name');
      expect(repository.getStored(plant.id)?.version).toBe(plant.version + 1);
    });

    it('should throw DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);

      await expect(
        useCase.execute(rename(plant.id), 'user-1', plant.version + 1)
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      repository.assertUpdateNotCalled();
      expect(repository.getStored(plant.id)?.version).toBe(plant.version);
    });

    it('should throw DomainNotFoundException (not stale) for an absent plant with a wrong version', async () => {
      await expect(
        useCase.execute(rename(random.uuid()), 'user-1', 999)
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should throw DomainNotFoundException (not stale) for a soft-deleted plant with a wrong version', async () => {
      const plant = PlantFactory.random();
      plant.markAsDeleted();
      repository.addToStorage(plant);

      await expect(
        useCase.execute(rename(plant.id), 'user-1', 999)
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should check the version before the family-existence rule', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);
      const existsSpy = jest.spyOn(familyRepository, 'exists');

      await expect(
        useCase.execute(
          { id: plant.id, identity: { family: random.uuid() } },
          'user-1',
          plant.version + 1
        )
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
      expect(existsSpy).not.toHaveBeenCalled();
    });

    it('should throw DomainStaleVersionException for a no-op patch with an outdated version', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);

      await expect(
        useCase.execute(
          rename(plant.id, plant.identity.name.primary),
          'user-1',
          plant.version + 1
        )
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
    });

    it('should accept a no-op patch with the current version without bumping it', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);

      await useCase.execute(
        rename(plant.id, plant.identity.name.primary),
        'user-1',
        plant.version
      );

      expect(repository.getStored(plant.id)?.version).toBe(plant.version);
    });

    it('should read twice, write once and never run the existence check on success', async () => {
      const plant = PlantFactory.random();
      repository.addToStorage(plant);

      await useCase.execute(rename(plant.id), 'user-1', plant.version);

      repository.assertReadCalledTimes('findActiveById', 2);
      repository.assertUpdateCalledTimes(1);
      repository.assertExistenceCountCalledTimes(0);
    });
  });

  it('should throw not found without updating nor checking family if plant does not exist', async () => {
    const input = { id: random.uuid(), identity: { family: random.uuid() } };
    const existsSpy = jest.spyOn(familyRepository, 'exists');

    await expect(
      useCase.execute(input, 'user-1', CURRENT_VERSION)
    ).rejects.toBeInstanceOf(DomainNotFoundException);

    repository.assertUpdateNotCalled();
    expect(existsSpy).not.toHaveBeenCalled();
  });

  it('should report the plant id in the not found message', async () => {
    const input = { id: random.uuid() };
    const expectedMessage = `Plant not found: ${input.id}`;

    const error = await useCase
      .execute(input, 'user-1', CURRENT_VERSION)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainNotFoundException);
    expect((error as DomainNotFoundException).message).toBe(expectedMessage);
  });

  it('should throw not found if the plant disappears after the update', async () => {
    const plant = PlantFactory.random();
    repository.addToStorage(plant);
    jest
      .spyOn(repository, 'findActiveById')
      .mockResolvedValueOnce(plant)
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute(
        { id: plant.id, identity: { name: { primary: 'New name' } } },
        'user-1',
        CURRENT_VERSION
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should call repository.updateWithDiff with correct payload', async () => {
    const plant = PlantFactory.random();
    const current = plantDomainMapper.toPrimitives(plant);

    repository.addToStorage(plant);

    await useCase.execute(
      {
        id: plant.id,
        identity: {
          name: { primary: 'Updated name' }
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    repository.assertUpdateHasBeenCalledWith(
      current,
      expect.objectContaining({
        ...plantDomainMapper.toPrimitives(plant),
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

  it('should update family when provided', async () => {
    const plant = PlantFactory.random();
    const current = plantDomainMapper.toPrimitives(plant);
    const family = FamilyScenarios.domainBase();

    repository.addToStorage(plant);
    familyRepository.addToStorage(family);

    await useCase.execute(
      {
        id: plant.id,
        identity: {
          family: family.id
        }
      },
      'user-1',
      CURRENT_VERSION
    );

    repository.assertUpdateHasBeenCalledWith(
      current,
      expect.objectContaining({
        ...plantDomainMapper.toPrimitives(plant),
        identity: expect.objectContaining({
          family: family.id
        }) as Partial<PlantPrimitives>['identity']
      }) as Partial<PlantPrimitives>,
      'user-1'
    );
  });

  it('should throw if trying to update to non existing family', async () => {
    const plant = PlantFactory.random();

    repository.addToStorage(plant);
    const family = random.uuid();

    await expect(
      useCase.execute(
        {
          id: plant.id,
          identity: {
            family
          }
        },
        'user-1',
        CURRENT_VERSION
      )
    ).rejects.toThrow(`Family with id ${family} does not exist`);
  });

  it('should throw not found error if plant is soft-deleted', async () => {
    const plant = PlantFactory.random({ deletedAt: new Date() });
    repository.addToStorage(plant);

    await expect(
      useCase.execute(
        {
          id: plant.id,
          identity: { name: { primary: 'New name' } }
        },
        'user-1',
        CURRENT_VERSION
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    repository.assertUpdateNotCalled();
  });

  it('should throw not found error if updateWithDiff rejects with DomainNotFoundException (concurrent delete)', async () => {
    const plant = PlantFactory.random();
    repository.addToStorage(plant);

    jest
      .spyOn(repository, 'updateWithDiff')
      .mockRejectedValueOnce(
        new DomainNotFoundException('Plant', plant.id.toString())
      );

    await expect(
      useCase.execute(
        { id: plant.id, identity: { name: { primary: 'New name' } } },
        'user-1',
        CURRENT_VERSION
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('should throw not found error when re-read finds soft-deleted plant after update (FR-007a)', async () => {
    const plant = PlantFactory.random();
    const deletedPlant = PlantFactory.random({
      id: plant.id,
      deletedAt: new Date()
    });
    repository.addToStorage(plant);

    jest.spyOn(repository, 'updateWithDiff').mockImplementationOnce(() => {
      repository.addToStorage(deletedPlant);
      return Promise.resolve();
    });

    await expect(
      useCase.execute(
        { id: plant.id, identity: { name: { primary: 'New name' } } },
        'user-1',
        CURRENT_VERSION
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });
});
