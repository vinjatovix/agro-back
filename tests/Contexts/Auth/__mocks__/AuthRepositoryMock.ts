import type { UserPrimitives } from '../../../../src/Contexts/Auth/domain/entities/types/UserPrimitives.js';
import type { User } from '../../../../src/Contexts/Auth/domain/entities/User.js';
import type {
  AuthRepository,
  CreateUserOutcome,
  UpdateUserOutcome
} from '../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import {
  createUserId,
  randomUserId
} from '../../../../src/Contexts/Auth/domain/UserId.js';
import type {
  AuthProvider,
  EmailTokenPurpose
} from '../../../../src/Contexts/Auth/domain/value-objects/types/index.js';
import type { UserRole } from '../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import type { WriteOutcome } from '../../../../src/Contexts/shared/domain/repositories/WriteOutcome.js';
import { Email } from '../../../../src/Contexts/shared/domain/valueObject/index.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';
import { UserMother } from '../domain/mothers/UserMother.js';

const DEFAULT_OPTIONS = { find: false };

type UserQuery = { id?: string; username?: string };

/**
 * With `find: true` every lookup finds an active account (validated, with a
 * local password). Results set with the `set*` helpers win over that default.
 */
export class AuthRepositoryMock implements AuthRepository {
  private readonly createMock = jest.fn<Promise<CreateUserOutcome>, [User]>();
  private readonly updateMock = jest.fn<
    Promise<UpdateUserOutcome>,
    [UserPrimitives, UserPrimitives]
  >();
  private readonly updateRolesMock = jest.fn<
    Promise<WriteOutcome>,
    [UserPrimitives, UserPrimitives]
  >();
  private readonly searchByUsernameMock = jest.fn<Nullable<User>, [string]>();
  private readonly countByRoleMock = jest.fn<Promise<number>, [UserRole]>();
  private readonly deleteIfReplaceableMock = jest.fn<
    Promise<boolean>,
    [User, Date]
  >();
  private readonly searchMock = jest.fn<Nullable<User>, [string]>();
  private readonly searchByIdMock = jest.fn<Nullable<User>, [string]>();
  private readonly searchByEmailTokenMock = jest.fn<
    Nullable<User>,
    [EmailTokenPurpose, string]
  >();
  private readonly searchByProviderMock = jest.fn<
    Nullable<User>,
    [AuthProvider, string]
  >();
  private readonly findByQueryMock = jest.fn<Partial<User>[], [UserQuery]>();
  private readonly password = UserMother.randomPasswordHash();
  private readonly storage: User[] = [];
  private searchResult: Nullable<User> | undefined;
  private searchByProviderResult: Nullable<User> | undefined;
  private isFindable: boolean;

  constructor({ find }: { find: boolean } = DEFAULT_OPTIONS) {
    this.isFindable = find;
    this.createMock.mockResolvedValue('created');
    this.updateMock.mockResolvedValue('written');
    this.updateRolesMock.mockResolvedValue('written');
    this.countByRoleMock.mockResolvedValue(2);
    this.deleteIfReplaceableMock.mockResolvedValue(true);
    this.searchByIdMock.mockReturnValue(null);
    this.searchByUsernameMock.mockReturnValue(null);
    this.searchByEmailTokenMock.mockReturnValue(null);
    this.setupLookups();
  }

  private setupLookups(): void {
    this.searchMock.mockImplementation((email: string) => {
      if (this.searchResult !== undefined) return this.searchResult;
      if (!this.isFindable) return null;

      return UserMother.active({
        email: new Email(email),
        password: this.password
      });
    });

    this.searchByProviderMock.mockImplementation(() => {
      if (this.searchByProviderResult !== undefined) {
        return this.searchByProviderResult;
      }
      if (!this.isFindable) return null;

      return UserMother.active({ password: this.password });
    });

    this.findByQueryMock.mockImplementation(({ id, username }: UserQuery) => {
      if (this.isFindable) {
        return [
          {
            id: id === undefined ? randomUserId() : createUserId(id),
            username: UserMother.randomUsername()
          }
        ];
      }

      return this.storage.filter(
        (user) =>
          (id === undefined || user.id === id) &&
          (username === undefined || user.username.value === username)
      );
    });
  }

  create(user: User): Promise<CreateUserOutcome> {
    return this.createMock(user);
  }

  update(
    before: UserPrimitives,
    after: UserPrimitives
  ): Promise<UpdateUserOutcome> {
    return this.updateMock(before, after);
  }

  updateRoles(
    before: UserPrimitives,
    after: UserPrimitives
  ): Promise<WriteOutcome> {
    return this.updateRolesMock(before, after);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchByUsername(username: string): Promise<Nullable<User>> {
    return this.searchByUsernameMock(username);
  }

  countByRole(role: UserRole): Promise<number> {
    return this.countByRoleMock(role);
  }

  deleteIfReplaceable(user: User, at: Date): Promise<boolean> {
    return this.deleteIfReplaceableMock(user, at);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async search(email: string): Promise<Nullable<User>> {
    return this.searchMock(email);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchById(id: string): Promise<Nullable<User>> {
    return this.searchByIdMock(id);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchByEmailToken(
    purpose: EmailTokenPurpose,
    tokenHash: string
  ): Promise<Nullable<User>> {
    return this.searchByEmailTokenMock(purpose, tokenHash);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async searchByProvider(
    provider: AuthProvider,
    providerUserId: string
  ): Promise<Nullable<User>> {
    return this.searchByProviderMock(provider, providerUserId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByQuery(query: UserQuery): Promise<Partial<User>[]> {
    return this.findByQueryMock(query);
  }

  setIsFindable(exists: boolean): void {
    this.isFindable = exists;
  }

  setSearchResult(user: Nullable<User> | undefined): void {
    this.searchResult = user;
  }

  setSearchResults(...users: Array<Nullable<User>>): void {
    for (const user of users) {
      this.searchMock.mockReturnValueOnce(user);
    }
  }

  setSearchByIdResult(user: Nullable<User>): void {
    this.searchByIdMock.mockReturnValue(user);
  }

  setSearchByUsernameResult(user: Nullable<User>): void {
    this.searchByUsernameMock.mockReturnValue(user);
  }

  setUpdateRolesOutcome(outcome: WriteOutcome): void {
    this.updateRolesMock.mockResolvedValue(outcome);
  }

  setCountByRole(count: number): void {
    this.countByRoleMock.mockResolvedValue(count);
  }

  setSearchByEmailTokenResult(user: Nullable<User>): void {
    this.searchByEmailTokenMock.mockReturnValue(user);
  }

  setSearchByProviderResult(user: Nullable<User> | undefined): void {
    this.searchByProviderResult = user;
  }

  /** Results answered by the next `searchByProvider` calls, in order. */
  setSearchByProviderResults(...users: Array<Nullable<User>>): void {
    for (const user of users) {
      this.searchByProviderMock.mockReturnValueOnce(user);
    }
  }

  setCreateOutcome(outcome: CreateUserOutcome): void {
    this.createMock.mockResolvedValue(outcome);
  }

  /** Outcomes answered by the next `create` calls, in order. */
  setCreateOutcomes(...outcomes: CreateUserOutcome[]): void {
    for (const outcome of outcomes) {
      this.createMock.mockResolvedValueOnce(outcome);
    }
  }

  /** Outcomes answered by the next `update` calls, in order. */
  setUpdateOutcomes(...outcomes: UpdateUserOutcome[]): void {
    for (const outcome of outcomes) {
      this.updateMock.mockResolvedValueOnce(outcome);
    }
  }

  setDeleteIfReplaceableResult(deleted: boolean): void {
    this.deleteIfReplaceableMock.mockResolvedValue(deleted);
  }

  addToStorage(user: User): void {
    this.storage.push(user);
  }

  assertCreatedWith(expected: unknown): void {
    expect(this.createMock).toHaveBeenCalledTimes(1);
    expect(this.createMock).toHaveBeenCalledWith(expected);
  }

  /** The single created user, to assert on its state. */
  createdUser(): User {
    expect(this.createMock).toHaveBeenCalledTimes(1);
    const [user] = this.createMock.mock.calls[0] ?? [];
    if (!user) throw new TypeError('No user was created');

    return user;
  }

  /** Every user passed to `create`, in call order. */
  createdUsers(): User[] {
    return this.createMock.mock.calls.map(([user]) => user);
  }

  assertUpdatedFrom(before: unknown, after: unknown): void {
    expect(this.updateMock).toHaveBeenLastCalledWith(before, after);
  }

  /** The `[before, after]` states of the last update. */
  lastUpdate(): [UserPrimitives, UserPrimitives] {
    const call = this.updateMock.mock.calls.at(-1);
    if (!call) throw new TypeError('No update was made');

    return call;
  }

  updateCount(): number {
    return this.updateMock.mock.calls.length;
  }

  assertDeletedIfReplaceable(user: User, at: Date): void {
    expect(this.deleteIfReplaceableMock).toHaveBeenCalledWith(user, at);
  }

  assertNotWritten(): void {
    expect(this.createMock).not.toHaveBeenCalled();
    expect(this.updateMock).not.toHaveBeenCalled();
    expect(this.deleteIfReplaceableMock).not.toHaveBeenCalled();
  }

  assertNotCreated(): void {
    expect(this.createMock).not.toHaveBeenCalled();
  }

  assertNotDeleted(): void {
    expect(this.deleteIfReplaceableMock).not.toHaveBeenCalled();
  }

  assertSearchHasBeenCalledWith(expected: string): void {
    expect(this.searchMock).toHaveBeenCalledWith(expected);
  }

  assertSearchByIdHasBeenCalledWith(expected: string): void {
    expect(this.searchByIdMock).toHaveBeenCalledWith(expected);
  }

  assertSearchByUsernameHasBeenCalledWith(expected: string): void {
    expect(this.searchByUsernameMock).toHaveBeenCalledWith(expected);
  }

  updateRolesCount(): number {
    return this.updateRolesMock.mock.calls.length;
  }

  assertRolesNotUpdated(): void {
    expect(this.updateRolesMock).not.toHaveBeenCalled();
  }

  assertSearchByEmailTokenHasBeenCalledWith(
    purpose: EmailTokenPurpose,
    tokenHash: string
  ): void {
    expect(this.searchByEmailTokenMock).toHaveBeenCalledWith(
      purpose,
      tokenHash
    );
  }

  assertSearchByProviderHasBeenCalledWith(
    provider: AuthProvider,
    providerUserId: string
  ): void {
    expect(this.searchByProviderMock).toHaveBeenCalledWith(
      provider,
      providerUserId
    );
  }

  assertFindByQueryHasBeenCalledWith(expected: UserQuery): void {
    expect(this.findByQueryMock).toHaveBeenCalledWith(expected);
  }
}
