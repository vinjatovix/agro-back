import type { Binary, UUID } from 'bson';
import type { MetadataType } from '../../../../shared/infrastructure/persistence/mongo/types/MetadataType.js';
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

export interface AuthDocument {
  _id: string | Binary | UUID;
  email: string;
  username: string;
  password: string;
  emailValidated: boolean;
  roles: string[];
  metadata: MetadataType;
}

export class MongoAuthRepository
  extends MongoRepository<User | UserPatch>
  implements UserRepository
{
  protected collectionName(): string {
    return 'users';
  }

  async save(user: User): Promise<void> {
    return this.persist(user.id.value, user);
  }

  async update(user: UserPatch, username: Username): Promise<void> {
    return this.persist(user.id.value, user, username);
  }

  async search(email: string): Promise<Nullable<User>> {
    const collection = await this.collection();
    const document = await collection.findOne<AuthDocument>({ email });

    return document
      ? User.fromPrimitives({
          id: fromMongoId(document._id),
          email: document.email,
          username: document.username,
          password: document.password,
          emailValidated: document.emailValidated,
          roles: document.roles,
          metadata: document.metadata
        })
      : null;
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
}
