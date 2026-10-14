import { MongoServerError, type MongoClient } from 'mongodb';

import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { MONGO_ERROR_CODES } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/mongoErrorCodes.js';
import { currentSession } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoSessionContext.js';
import { MongoUnitOfWork } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoUnitOfWork.js';
import type { AppLogger } from '../../../../../../src/Contexts/shared/plugins/index.js';

const TRANSIENT = 'TransientTransactionError';
const UNKNOWN_COMMIT = 'UnknownTransactionCommitResult';
const SHUTDOWN_IN_PROGRESS = 91;

type FakeSession = {
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  abortTransaction: jest.Mock;
  endSession: jest.Mock;
};

type Fixture = {
  unitOfWork: MongoUnitOfWork;
  session: FakeSession;
  startSession: jest.Mock;
  logger: { [K in keyof AppLogger]: jest.Mock };
};

function createFixture(): Fixture {
  const session: FakeSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined)
  };
  const startSession = jest.fn().mockReturnValue(session);
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const client = { startSession } as unknown as MongoClient;

  return {
    unitOfWork: new MongoUnitOfWork({ DBClient: client, logger }),
    session,
    startSession,
    logger
  };
}

function labelledError(
  label: string,
  code: number = SHUTDOWN_IN_PROGRESS
): MongoServerError {
  const error = new MongoServerError({ message: label, code });
  error.addErrorLabel(label);

  return error;
}

describe('MongoUnitOfWork (retry policy, fake driver)', () => {
  it('commits once and resolves with the value of work', async () => {
    const { unitOfWork, session } = createFixture();
    const work = jest.fn().mockResolvedValue('done');

    await expect(unitOfWork.run(work)).resolves.toBe('done');

    expect(work).toHaveBeenCalledTimes(1);
    expect(session.startTransaction).toHaveBeenCalledWith({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary'
    });
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('exposes the session to repositories only while work runs', async () => {
    const { unitOfWork, session } = createFixture();
    let seen: unknown;

    await unitOfWork.run(() => {
      seen = currentSession();

      return Promise.resolve();
    });

    expect(seen).toBe(session);
    expect(currentSession()).toBeUndefined();
  });

  it('aborts, rethrows unchanged and never retries a non-labelled error', async () => {
    const { unitOfWork, session } = createFixture();
    const failure = new MongoServerError({ message: 'boom', code: 2 });
    const work = jest.fn().mockRejectedValue(failure);

    await expect(unitOfWork.run(work)).rejects.toBe(failure);

    expect(work).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('aborts and rethrows a domain exception without retrying it', async () => {
    const { unitOfWork, session } = createFixture();
    const failure = new DomainConflictException();
    const work = jest.fn().mockRejectedValue(failure);

    await expect(unitOfWork.run(work)).rejects.toBe(failure);

    expect(work).toHaveBeenCalledTimes(1);
    expect(session.startTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
  });

  it('keeps the original error when the abort itself fails', async () => {
    const { unitOfWork, session } = createFixture();
    const failure = new DomainConflictException();
    session.abortTransaction.mockRejectedValue(new Error('abort failed'));

    await expect(unitOfWork.run(() => Promise.reject(failure))).rejects.toBe(
      failure
    );
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('retries the whole unit after a transient error and logs the retry', async () => {
    const { unitOfWork, session, logger } = createFixture();
    const work = jest
      .fn()
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockResolvedValue('done');

    await expect(unitOfWork.run(work)).resolves.toBe('done');

    expect(work).toHaveBeenCalledTimes(2);
    expect(session.startTransaction).toHaveBeenCalledTimes(2);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`attempt 1.*${TRANSIENT}`)),
      expect.any(MongoServerError)
    );
  });

  it('gives up after 3 attempts and rethrows the last transient driver error', async () => {
    const { unitOfWork, session, logger } = createFixture();
    const last = labelledError(TRANSIENT);
    const work = jest
      .fn()
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockRejectedValueOnce(last);

    await expect(unitOfWork.run(work)).rejects.toBe(last);

    expect(work).toHaveBeenCalledTimes(3);
    expect(session.abortTransaction).toHaveBeenCalledTimes(3);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenLastCalledWith(expect.any(String), last);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('maps a write conflict that outlasts the budget to a domain conflict and logs its cause', async () => {
    const { unitOfWork, logger } = createFixture();
    const conflict = labelledError(TRANSIENT, MONGO_ERROR_CODES.WRITE_CONFLICT);
    const work = jest.fn().mockRejectedValue(conflict);

    await expect(unitOfWork.run(work)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    expect(work).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenLastCalledWith(expect.any(String), conflict);
  });

  it('retries only the commit when its result is unknown', async () => {
    const { unitOfWork, session, logger } = createFixture();
    const work = jest.fn().mockResolvedValue('done');
    session.commitTransaction
      .mockRejectedValueOnce(labelledError(UNKNOWN_COMMIT))
      .mockResolvedValue(undefined);

    await expect(unitOfWork.run(work)).resolves.toBe('done');

    expect(work).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(UNKNOWN_COMMIT),
      expect.any(MongoServerError)
    );
  });

  it('gives up on an unknown commit result after 3 attempts', async () => {
    const { unitOfWork, session } = createFixture();
    const failure = labelledError(UNKNOWN_COMMIT);
    session.commitTransaction.mockRejectedValue(failure);

    await expect(unitOfWork.run(() => Promise.resolve())).rejects.toBe(failure);

    expect(session.commitTransaction).toHaveBeenCalledTimes(3);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('shares one budget between unit retries and commit retries', async () => {
    const { unitOfWork, session } = createFixture();
    const failure = labelledError(UNKNOWN_COMMIT);
    const work = jest
      .fn()
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockResolvedValue('done');
    session.commitTransaction.mockRejectedValue(failure);

    await expect(unitOfWork.run(work)).rejects.toBe(failure);

    expect(work).toHaveBeenCalledTimes(2);
    expect(session.commitTransaction).toHaveBeenCalledTimes(2);
  });

  it('retries the whole unit when the commit fails with a transient error', async () => {
    const { unitOfWork, session } = createFixture();
    const work = jest.fn().mockResolvedValue('done');
    session.commitTransaction
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockResolvedValue(undefined);

    await expect(unitOfWork.run(work)).resolves.toBe('done');

    expect(work).toHaveBeenCalledTimes(2);
    expect(session.startTransaction).toHaveBeenCalledTimes(2);
    expect(session.commitTransaction).toHaveBeenCalledTimes(2);
  });

  it('joins an active unit when run is nested, without own transaction or retries', async () => {
    const { unitOfWork, session, startSession } = createFixture();
    const inner = jest
      .fn()
      .mockRejectedValueOnce(labelledError(TRANSIENT))
      .mockResolvedValue('inner');
    const outer = jest.fn(() => unitOfWork.run(inner));

    await expect(unitOfWork.run(outer)).resolves.toBe('inner');

    expect(startSession).toHaveBeenCalledTimes(1);
    expect(outer).toHaveBeenCalledTimes(2);
    expect(inner).toHaveBeenCalledTimes(2);
    expect(session.startTransaction).toHaveBeenCalledTimes(2);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
  });
});
