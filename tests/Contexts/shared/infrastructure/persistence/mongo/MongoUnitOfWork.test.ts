import type { MongoClient } from 'mongodb';

import {
  type AppContainer,
  createAppContainer
} from '../../../../../../src/apps/agroApi/container.js';
import type { BedRepository } from '../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { EnvironmentArranger } from '../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { DBClientFactory } from '../../../../../../src/shared/infrastructure/persistence/index.js';
import { createTestDBConfig } from '../../../../../shared/infrastructure/persistence/mongo/testDBConfig.js';
import { SOURCE_ROOT } from '../../../../../shared/sourceRoot.js';
import { BedFactory } from '../../../../Agro/Beds/domain/mothers/BedFactory.js';

let container: AppContainer;
let client: MongoClient;
let environmentArranger: EnvironmentArranger;
let unitOfWork: UnitOfWork;
let bedRepository: BedRepository;

class ForcedFailure extends Error {}

async function seedBed(): Promise<{ id: string; version: number }> {
  const bed = BedFactory.create();
  await bedRepository.save(bed);

  return { id: bed.id, version: bed.version };
}

async function storedVersion(id: string): Promise<number | undefined> {
  return (await bedRepository.findById(id))?.version;
}

describe('MongoUnitOfWork (integration)', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      createTestDBConfig()
    );
    container = await createAppContainer({
      db: client.db(),
      client,
      sourceRoot: SOURCE_ROOT
    });
    environmentArranger = container.resolve<EnvironmentArranger>(
      'environmentArranger'
    );
    unitOfWork = container.resolve<UnitOfWork>('unitOfWork');
    bedRepository = container.resolve<BedRepository>('bedRepository');
  });

  beforeEach(async () => {
    await environmentArranger.arrange();
  });

  afterAll(async () => {
    await client.close();
  });

  it('rolls back a bed version raise when the unit fails afterwards', async () => {
    const bed = await seedBed();

    await expect(
      unitOfWork.run(async () => {
        await bedRepository.conditionalIncrementVersion(bed.id, bed.version);
        throw new ForcedFailure();
      })
    ).rejects.toBeInstanceOf(ForcedFailure);

    expect(await storedVersion(bed.id)).toBe(bed.version);
  });

  it('commits the bed version raise when the unit succeeds', async () => {
    const bed = await seedBed();

    await unitOfWork.run(() =>
      bedRepository.conditionalIncrementVersion(bed.id, bed.version)
    );

    expect(await storedVersion(bed.id)).toBe(bed.version + 1);
  });

  it('lets only one of two units racing on the same bed commit', async () => {
    const bed = await seedBed();
    let releaseWinner: () => void = () => undefined;
    const winnerGate = new Promise<void>((resolve) => {
      releaseWinner = resolve;
    });
    let winnerHoldsLock: () => void = () => undefined;
    const lockTaken = new Promise<void>((resolve) => {
      winnerHoldsLock = resolve;
    });

    const winner = unitOfWork.run(async () => {
      await bedRepository.conditionalIncrementVersion(bed.id, bed.version);
      winnerHoldsLock();
      await winnerGate;
    });

    await lockTaken;
    const loser = unitOfWork.run(() =>
      bedRepository.conditionalIncrementVersion(bed.id, bed.version)
    );
    const loserOutcome = await loser.catch((error: unknown) => error);
    releaseWinner();

    await expect(winner).resolves.toBeUndefined();
    expect(loserOutcome).toBeInstanceOf(DomainConflictException);
    expect(await storedVersion(bed.id)).toBe(bed.version + 1);
  });

  it('keeps writes outside a unit working as before', async () => {
    const bed = await seedBed();

    await bedRepository.conditionalIncrementVersion(bed.id, bed.version);

    expect(await storedVersion(bed.id)).toBe(bed.version + 1);
  });
});
