import { isDeepStrictEqual } from 'node:util';
import type { Binary, UUID } from 'bson';
import { type Db, MongoServerError } from 'mongodb';
import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../shared/domain/types/UnknownRecord.js';
import { isRecord } from '../../../../shared/domain/utils/isRecord.js';
import { DomainConflictException } from '../../../shared/domain/errors/index.js';
import type { MetadataPrimitives } from '../../../shared/domain/MetadataPrimitives.js';
import { MONGO_ERROR_CODES } from '../../../shared/infrastructure/persistence/mongo/mongoErrorCodes.js';
import { MongoErrorHandler } from '../../../shared/infrastructure/persistence/mongo/MongoErrorHandler.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoRepository } from '../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import { USER_NOT_CREATED_MESSAGE } from '../../application/messages.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import { User } from '../../domain/entities/User.js';
import type {
  AuthRepository,
  CreateUserOutcome,
  UpdateUserOutcome
} from '../../domain/repositories/interfaces/AuthRepository.js';
import { createUserId } from '../../domain/UserId.js';
import type { AuthProvider } from '../../domain/value-objects/types/AuthProvider.js';
import type {
  EmailTokenPrimitives,
  EmailTokenPurpose
} from '../../domain/value-objects/types/EmailTokenPrimitives.js';
import type { UserAuthMethodPrimitives } from '../../domain/value-objects/types/UserAuthMethodPrimitives.js';
import { Username } from '../../domain/value-objects/Username.js';

export interface AuthDocument {
  _id: string | Binary | UUID;
  email: string;
  username: string;
  password?: string;
  emailValidated: boolean;
  authMethods?: UserAuthMethodPrimitives[];
  emailTokens?: EmailTokenPrimitives[];
  roles: string[];
  metadata: MetadataPrimitives;
}

type UserWrite = {
  set: UnknownRecord;
  unset: Record<string, ''>;
  /** The `before` value of every changed field except `metadata`. */
  expected: UnknownRecord;
};

export type MongoAuthRepositoryDependencies = {
  db: Db;
};

export class MongoAuthRepository
  extends MongoRepository
  implements AuthRepository
{
  constructor({ db }: MongoAuthRepositoryDependencies) {
    super(db);
  }
  protected entityName(): string {
    return 'User';
  }
  protected collectionName(): string {
    return `${this.entityName().toLowerCase()}s`;
  }

  async create(user: User): Promise<CreateUserOutcome> {
    const { id, ...userPrimitives } = user.toPrimitives();

    try {
      await this.collection().insertOne(
        { _id: toMongoId(id), ...userPrimitives },
        this.sessionOptions()
      );
      return 'created';
    } catch (error: unknown) {
      return this.duplicateOutcome(error, id);
    }
  }

  async update(
    before: UserPrimitives,
    after: UserPrimitives
  ): Promise<UpdateUserOutcome> {
    const write = this.diff(before, after);
    const hasSet = Object.keys(write.set).length > 0;
    const hasUnset = Object.keys(write.unset).length > 0;

    if (!hasSet && !hasUnset) return 'unchanged';

    const result = await this.handleMongoError(() =>
      this.collection().updateOne(
        { _id: toMongoId(before.id), ...write.expected },
        {
          ...(hasSet && { $set: write.set }),
          ...(hasUnset && { $unset: write.unset })
        },
        this.sessionOptions()
      )
    );

    return result.matchedCount === 0 ? 'stale' : 'written';
  }

  async deleteIfReplaceable(user: User, at: Date): Promise<boolean> {
    const result = await this.handleMongoError(() =>
      this.collection().deleteOne(
        {
          _id: toMongoId(user.id),
          emailValidated: false,
          emailTokens: {
            $not: {
              $elemMatch: { purpose: 'activation', expiresAt: { $gt: at } }
            }
          }
        },
        this.sessionOptions()
      )
    );

    return result.deletedCount === 1;
  }

  async search(email: string): Promise<Nullable<User>> {
    return this.findOneUser({ email });
  }

  async searchById(id: string): Promise<Nullable<User>> {
    return this.findOneUser({ _id: toMongoId(id) });
  }

  async searchByEmailToken(
    purpose: EmailTokenPurpose,
    tokenHash: string
  ): Promise<Nullable<User>> {
    // The plain path equality lets the planner use the partial unique index
    // on `emailTokens.tokenHash`; `$elemMatch` ties the purpose to that entry.
    return this.findOneUser({
      'emailTokens.tokenHash': tokenHash,
      emailTokens: { $elemMatch: { purpose, tokenHash } }
    });
  }

  async searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>> {
    return this.findOneUser({
      authMethods: {
        $elemMatch: {
          provider,
          providerUserId
        }
      }
    });
  }

  async findByQuery(query: {
    id?: string;
    username?: string;
  }): Promise<Partial<User>[]> {
    const filter = {
      ...(query.id && { _id: toMongoId(query.id) }),
      ...(query.username && { username: query.username })
    };
    const collection = this.collection();
    const documents = await collection
      .find<AuthDocument>(filter, {
        projection: { password: 0 },
        ...this.sessionOptions()
      })
      .toArray();

    return documents.map((doc) => ({
      id: createUserId(fromMongoId(doc._id)),
      username: new Username(doc.username)
    }));
  }

  private async findOneUser(filter: UnknownRecord): Promise<Nullable<User>> {
    const document = await this.collection().findOne<AuthDocument>(
      filter,
      this.sessionOptions()
    );

    return this.mapDocumentToUser(document);
  }

  /**
   * Top-level diff of two full states. A removed field is unset, never
   * stored as `null`; `metadata` is written field by field as given and is
   * not part of the compare-and-set guard.
   */
  private diff(before: UserPrimitives, after: UserPrimitives): UserWrite {
    const previous = before as unknown as UnknownRecord;
    const next = after as unknown as UnknownRecord;
    const write: UserWrite = { set: {}, unset: {}, expected: {} };
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);

    keys.delete('id');
    keys.delete('metadata');

    for (const key of keys) {
      if (isDeepStrictEqual(previous[key], next[key])) continue;

      this.addFieldChange(write, key, previous[key], next[key]);
    }

    this.addMetadataChanges(write, before.metadata, after.metadata);

    return write;
  }

  private addFieldChange(
    write: UserWrite,
    key: string,
    previous: unknown,
    next: unknown
  ): void {
    if (next === undefined) {
      write.unset[key] = '';
    } else {
      write.set[key] = next;
    }

    write.expected[key] =
      previous === undefined ? { $exists: false } : previous;
  }

  private addMetadataChanges(
    write: UserWrite,
    previous: MetadataPrimitives,
    next: MetadataPrimitives
  ): void {
    for (const key of Object.keys(next) as Array<keyof MetadataPrimitives>) {
      if (!isDeepStrictEqual(previous[key], next[key])) {
        write.set[`metadata.${key}`] = next[key];
      }
    }
  }

  /**
   * Maps a duplicate key on insert. Email, username and provider id are
   * outcomes each caller decides on; an id or any other key is a conflict
   * reported without the duplicated value.
   */
  private duplicateOutcome(error: unknown, id: string): CreateUserOutcome {
    const key = this.duplicatedKey(error);

    if (key === 'email') return 'emailTaken';
    if (key === 'username') return 'usernameTaken';
    if (key === 'authMethods.providerUserId') return 'providerTaken';
    if (key === '_id') {
      throw new DomainConflictException(`User with id ${id} already exists`);
    }
    if (key !== undefined) {
      throw new DomainConflictException(USER_NOT_CREATED_MESSAGE);
    }
    if (error instanceof MongoServerError) {
      MongoErrorHandler.formatError(error);
    }

    throw error;
  }

  private duplicatedKey(error: unknown): string | undefined {
    if (
      !(error instanceof MongoServerError) ||
      error.code !== MONGO_ERROR_CODES.DUPLICATE_KEY
    ) {
      return undefined;
    }

    const response: unknown = error.errorResponse;
    const keyPattern = isRecord(response) ? response.keyPattern : undefined;

    return isRecord(keyPattern) ? Object.keys(keyPattern)[0] : undefined;
  }

  private mapDocumentToUser(document: Nullable<AuthDocument>): Nullable<User> {
    return document
      ? User.fromPrimitives({
          id: fromMongoId(document._id),
          email: document.email,
          username: document.username,
          ...(document.password !== undefined && {
            password: document.password
          }),
          emailValidated: document.emailValidated,
          ...(document.authMethods !== undefined && {
            authMethods: document.authMethods
          }),
          ...(document.emailTokens !== undefined && {
            emailTokens: document.emailTokens
          }),
          roles: document.roles,
          metadata: document.metadata
        })
      : null;
  }
}
