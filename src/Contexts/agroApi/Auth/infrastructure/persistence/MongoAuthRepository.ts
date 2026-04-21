import type { Binary, UUID } from 'bson';
import type { MetadataPrimitives } from '../../../../shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js';
import type {
  AuthProvider,
  UserAuthMethodPrimitives
} from '../../domain/UserAuthMethod.js';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import { User } from '../../domain/User.js';
import type { UserPatch } from '../../domain/UserPatch.js';
import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import { MongoRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { Username } from '../../domain/Username.js';
import { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import { updateMetadata } from '../../../../shared/application/utils/updateMetadata.js';

export interface AuthDocument {
  _id: string | Binary | UUID;
  email: string;
  username: string;
  password?: string;
  emailValidated: boolean;
  authMethods?: UserAuthMethodPrimitives[];
  roles: string[];
  metadata: MetadataPrimitives;
}

export class MongoAuthRepository
  extends MongoRepository<User>
  implements UserRepository
{
  protected collectionName(): string {
    return 'users';
  }

  async save(user: User): Promise<void> {
    return this.persist(user.id.value, user);
  }

  async update(user: UserPatch, username: Username): Promise<void> {
    const collection = await this.collection();

    const mongoId = toMongoId(user.id.value);

    const document = {
      ...user.toPrimitives(),
      ...(username && updateMetadata(username))
    };

    await this.handleMongoError(
      async () =>
        await collection.updateOne({ _id: mongoId }, { $set: document })
    );
  }

  async search(email: string): Promise<Nullable<User>> {
    const collection = await this.collection();
    const document = await collection.findOne<AuthDocument>({ email });

    return this.mapDocumentToUser(document);
  }

  async searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>> {
    const collection = await this.collection();
    const document = await collection.findOne<AuthDocument>({
      authMethods: {
        $elemMatch: {
          provider,
          providerUserId
        }
      }
    });

    return this.mapDocumentToUser(document);
  }

  async findByQuery(query: {
    id?: string;
    username?: string;
  }): Promise<Partial<User>[]> {
    const filter = {
      ...(query.id && { _id: toMongoId(query.id) }),
      ...(query.username && { username: query.username })
    };
    const collection = await this.collection();
    const documents = await collection
      .find<AuthDocument>(filter, { projection: { password: 0 } })
      .toArray();

    return documents.map((doc) => ({
      id: new Uuid(fromMongoId(doc._id)),
      username: new Username(doc.username)
    }));
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
          roles: document.roles,
          metadata: document.metadata
        })
      : null;
  }
}
