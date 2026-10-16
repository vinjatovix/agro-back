import { asClass } from 'awilix';
import type { BedRepository } from '../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { MongoBedRepository } from '../../../../../../src/Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';

import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { BedFactory } from '../../../../Agro/Beds/domain/mothers/BedFactory.js';

let context: DbTestContext;
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
    context = await createDbTestContext({
      bedRepository: asClass(MongoBedRepository).singleton()
    });
    const { container } = context;
    unitOfWork = container.resolve<UnitOfWork>('unitOfWork');
    bedRepository = container.resolve<BedRepository>('bedRepository');
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
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
