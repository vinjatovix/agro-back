import {
  MongoError,
  type ClientSession,
  type MongoClient,
  type TransactionOptions
} from 'mongodb';

import type { UnitOfWork } from '../../../application/interfaces/index.js';
import { DomainConflictException } from '../../../domain/errors/index.js';
import type { AppLogger } from '../../../plugins/index.js';
import { MONGO_ERROR_CODES } from './mongoErrorCodes.js';
import { currentSession, runWithSession } from './MongoSessionContext.js';

/** Shared by whole-unit retries and commit retries; no backoff. */
const MAX_ATTEMPTS = 3;

const TRANSIENT_TRANSACTION_ERROR = 'TransientTransactionError';
const UNKNOWN_COMMIT_RESULT = 'UnknownTransactionCommitResult';

const TRANSACTION_OPTIONS: TransactionOptions = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary'
};

type AttemptBudget = { attempt: number };

export type MongoUnitOfWorkDependencies = {
  DBClient: MongoClient;
  logger: AppLogger;
};

/**
 * Runs a unit of work inside a MongoDB multi-document transaction. Repository
 * calls made inside `work` pick the session up from `MongoSessionContext`.
 *
 * Not `session.withTransaction()`: it retries for up to 120 s, and the budget
 * here is 3 attempts in total.
 */
export class MongoUnitOfWork implements UnitOfWork {
  private readonly client: MongoClient;
  private readonly logger: AppLogger;

  constructor({ DBClient, logger }: MongoUnitOfWorkDependencies) {
    this.client = DBClient;
    this.logger = logger;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    // MongoDB has no nested transactions: a unit started inside another one
    // joins it, so the outer unit still commits or aborts everything.
    if (currentSession() !== undefined) {
      return work();
    }

    const session = this.client.startSession();

    try {
      return await this.runWithRetries(session, work);
    } finally {
      await session.endSession();
    }
  }

  private async runWithRetries<T>(
    session: ClientSession,
    work: () => Promise<T>
  ): Promise<T> {
    const budget: AttemptBudget = { attempt: 1 };

    for (;;) {
      try {
        const result = await this.runAttempt(session, work);
        await this.commitWithRetry(session, budget);

        return result;
      } catch (error: unknown) {
        if (!this.isRetryable(error, TRANSIENT_TRANSACTION_ERROR)) throw error;

        if (budget.attempt >= MAX_ATTEMPTS) {
          // Logged here: the 409 it may become no longer carries the cause.
          this.logger.warn(
            `Transaction gave up after ${budget.attempt} attempts with ${TRANSIENT_TRANSACTION_ERROR}`,
            error
          );
          throw this.toExhaustedError(error);
        }

        this.logRetry(TRANSIENT_TRANSACTION_ERROR, budget, error);
        budget.attempt += 1;
      }
    }
  }

  private async runAttempt<T>(
    session: ClientSession,
    work: () => Promise<T>
  ): Promise<T> {
    session.startTransaction(TRANSACTION_OPTIONS);

    try {
      return await runWithSession(session, work);
    } catch (error: unknown) {
      await this.abort(session);
      throw error;
    }
  }

  /** The commit is idempotent for the same session, so it can be resent. */
  private async commitWithRetry(
    session: ClientSession,
    budget: AttemptBudget
  ): Promise<void> {
    for (;;) {
      try {
        await session.commitTransaction();
        return;
      } catch (error: unknown) {
        const canRetry =
          this.isRetryable(error, UNKNOWN_COMMIT_RESULT) &&
          budget.attempt < MAX_ATTEMPTS;

        if (!canRetry) throw error;

        this.logRetry(UNKNOWN_COMMIT_RESULT, budget, error);
        budget.attempt += 1;
      }
    }
  }

  private async abort(session: ClientSession): Promise<void> {
    try {
      await session.abortTransaction();
    } catch (abortError: unknown) {
      // The original error matters more; the server drops the transaction
      // on its own when it times out.
      this.logger.warn('Could not abort the transaction', abortError);
    }
  }

  private isRetryable(error: unknown, label: string): error is MongoError {
    return error instanceof MongoError && error.hasErrorLabel(label);
  }

  /**
   * A write conflict means another request changed the same record, so the
   * answer is 409. Other transient failures stay as they are (500).
   */
  private toExhaustedError(error: MongoError): Error {
    if (error.code === MONGO_ERROR_CODES.WRITE_CONFLICT) {
      return new DomainConflictException(
        'The resource was modified concurrently, try again'
      );
    }

    return error;
  }

  private logRetry(label: string, budget: AttemptBudget, error: unknown): void {
    this.logger.warn(
      `Transaction attempt ${budget.attempt} failed with ${label}; retrying`,
      error
    );
  }
}
