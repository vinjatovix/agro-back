import type { UserRepository } from '../../../../src/Contexts/Auth/domain/entities/types/index.js';
import type { AuthProvider } from '../../../../src/Contexts/Auth/domain/value-objects/types/AuthProvider.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';
import {
  Email,
  Uuid
} from '../../../../src/Contexts/shared/domain/valueObject/index.js';
import { UserMother } from '../domain/mothers/UserMother.js';
import {
  PasswordHash,
  Username
} from '../../../../src/Contexts/Auth/domain/value-objects/index.js';
import type { User } from '../../../../src/Contexts/Auth/domain/entities/User.js';
import type { UserPatch } from '../../../../src/Contexts/Auth/domain/entities/UserPatch.js';

const DEFAULT_OPTIONS = { find: false };

export class UserRepositoryMock implements UserRepository {
  private readonly saveMock = jest.fn();
  private readonly updateMock = jest.fn();
  private readonly findMock = jest.fn();
  private readonly findByProviderMock = jest.fn();
  private readonly findByQueryMock = jest.fn();
  private readonly password = new PasswordHash(
    UserMother.randomPasswordHash().value
  );
  private searchResult: Nullable<User> | undefined;
  private searchByProviderResult: Nullable<User> | undefined;

  private isFindable: boolean;
  private readonly storage: User[] = [];

  constructor({ find }: { find: boolean } = DEFAULT_OPTIONS) {
    this.isFindable = find;
    this.setupMocks();
  }

  private setupMocks(): void {
    this.findMock.mockImplementation((email: string) => {
      if (this.searchResult !== undefined) {
        return this.searchResult;
      }

      if (!this.isFindable) {
        return null;
      }
      return UserMother.create({
        email: new Email(email),
        password: this.password
      });
    });

    this.findByQueryMock.mockImplementation(
      ({ id, username }: { id: string; username: string }) => {
        if (!this.isFindable) {
          return this.storage.filter((user) => {
            if (id) {
              return user.id.value === id;
            }
            if (username) {
              return user.username.value === username;
            }
            return true;
          });
        }

        const { password: _password, ...user } = UserMother.create({
          id: new Uuid(id)
        });
        return [user];
      }
    );

    this.findByProviderMock.mockImplementation(
      (_provider: AuthProvider, _providerUserId: string) => {
        if (this.searchByProviderResult !== undefined) {
          return this.searchByProviderResult;
        }

        if (!this.isFindable) {
          return null;
        }

        return UserMother.create({ password: this.password });
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(user: User): Promise<void> {
    this.saveMock(user);
  }

  assertSaveHasBeenCalledWith(expected: User): void {
    expect(this.saveMock).toHaveBeenCalledWith(expected);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(user: UserPatch, username: Username): Promise<void> {
    this.updateMock(user, username);
  }

  assertUpdateHasBeenCalledWith(expected: UserPatch): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastCall = this.updateMock.mock.calls.at(-1) as
      | [UserPatch, Username]
      | undefined;
    expect(lastCall?.[0]).toEqual(expected);
  }

  assertUpdateHasBeenCalledWithUsername(expected: Username): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastCall: [UserPatch, Username] | undefined =
      this.updateMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual(expected);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async search(email: string): Promise<Nullable<User>> {
    return this.findMock(email) as Nullable<User>;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>> {
    return this.findByProviderMock(provider, providerUserId) as Nullable<User>;
  }

  assertSearchHasBeenCalledWith(expected: string): void {
    expect(this.findMock).toHaveBeenCalledWith(expected);
  }

  assertSearchByProviderHasBeenCalledWith(
    provider: AuthProvider,
    providerUserId: string
  ): void {
    expect(this.findByProviderMock).toHaveBeenCalledWith(
      provider,
      providerUserId
    );
  }

  async findByQuery(query: {
    id?: string;
    username?: string;
  }): Promise<Partial<User>[]> {
    return (await this.findByQueryMock(query)) as Partial<User>[];
  }

  assertFindByQueryHasBeenCalledWith(expected: {
    id?: string;
    username?: string;
  }): void {
    expect(this.findByQueryMock).toHaveBeenCalledWith(expected);
  }

  setIsFindable(exists: boolean): void {
    this.isFindable = exists;
  }

  setSearchResult(user: Nullable<User> | undefined): void {
    this.searchResult = user;
  }

  setSearchByProviderResult(user: Nullable<User> | undefined): void {
    this.searchByProviderResult = user;
  }

  addToStorage(user: User): void {
    this.storage.push(user);
  }
}
