import {
  CONCURRENT_CHANGE_MESSAGE,
  ProviderUserResolver,
  USER_NOT_CREATED_MESSAGE
} from '../../../../../src/Contexts/Auth/application/index.js';
import {
  DomainConflictException,
  DomainUnauthorizedException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock
} from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

const CASES = [
  {
    provider: 'google' as const,
    providerUserId: 'provider-sub-1',
    invalidAuthorizationMessage: 'Invalid Google token'
  },
  {
    provider: 'github' as const,
    providerUserId: '1234567',
    invalidAuthorizationMessage: 'Invalid GitHub authorization'
  }
];

describe('ProviderUserResolver', () => {
  let repository: AuthRepositoryMock;
  let notifier: AccountNotifierMock;
  let resolver: ProviderUserResolver;

  beforeEach(() => {
    repository = new AuthRepositoryMock({ find: false });
    notifier = new AccountNotifierMock();
    resolver = new ProviderUserResolver({
      authRepository: repository,
      accountNotifier: notifier
    });
  });

  describe.each(CASES)(
    'for $provider',
    ({ provider, providerUserId, invalidAuthorizationMessage }) => {
      const request = {
        provider,
        providerUserId,
        email: 'resolve-user@aa.com',
        invalidAuthorizationMessage
      };

      it('should return the account matched by provider id, without writing or emailing', async () => {
        const stored = UserMother.activeLinkedTo(provider, providerUserId);
        repository.setSearchByProviderResult(stored);
        const searchSpy = jest.spyOn(repository, 'search');

        const result = await resolver.resolve(request);

        expect(result).toBe(stored);
        repository.assertSearchByProviderHasBeenCalledWith(
          provider,
          providerUserId
        );
        expect(searchSpy).not.toHaveBeenCalled();
        repository.assertNotWritten();
        notifier.assertNothingSent();
      });

      it('should match the account by provider id even when the provider email changed', async () => {
        const stored = UserMother.activeLinkedTo(provider, providerUserId);
        repository.setSearchByProviderResult(stored);
        const searchSpy = jest.spyOn(repository, 'search');

        const result = await resolver.resolve({
          ...request,
          email: 'changed-at-provider@aa.com'
        });

        expect(result).toBe(stored);
        expect(searchSpy).not.toHaveBeenCalled();
        repository.assertNotWritten();
        notifier.assertNothingSent();
      });

      describe('when no account has the provider id', () => {
        beforeEach(() => {
          repository.setSearchByProviderResult(null);
        });

        it('should create a validated account with the first free username, the provider linked and no password', async () => {
          repository.setSearchResult(null);

          const result = await resolver.resolve({
            ...request,
            email: 'newuser@aa.com'
          });

          const created = repository.createdUser();
          expect(created.emailValidated).toBe(true);
          expect(created.toPrimitives()).not.toHaveProperty('password');
          expect(
            created.authMethods.map((method) => method.toPrimitives())
          ).toEqual([expect.objectContaining({ provider, providerUserId })]);
          expect(created.username.value).toBe('newuser');
          expect(result).toBe(created);
          notifier.assertNothingSent();
        });

        it('should try another username starting with the base when it is taken', async () => {
          repository.setSearchResult(null);
          repository.setCreateOutcomes('usernameTaken');

          await resolver.resolve({ ...request, email: 'newuser@aa.com' });

          const [first, second] = repository
            .createdUsers()
            .map((user) => user.username.value);
          expect(first).toBe('newuser');
          expect(second).toMatch(/^newuser\d{4}$/);
        });

        it('should answer a conflict without creating when every username is taken', async () => {
          repository.setSearchResult(null);
          repository.setCreateOutcomes(
            'usernameTaken',
            'usernameTaken',
            'usernameTaken',
            'usernameTaken',
            'usernameTaken'
          );

          const result = resolver.resolve(request);

          await expect(result).rejects.toThrow(DomainConflictException);
          await expect(result).rejects.toThrow(USER_NOT_CREATED_MESSAGE);
          expect(repository.createdUsers()).toHaveLength(5);
        });

        it('should sign in to the account a concurrent request created, re-resolving once', async () => {
          const winner = UserMother.activeLinkedTo(provider, providerUserId);
          repository.setSearchResult(null);
          repository.setCreateOutcomes('emailTaken');
          repository.setSearchByProviderResults(null, winner);

          const result = await resolver.resolve(request);

          expect(result).toBe(winner);
          expect(repository.createdUsers()).toHaveLength(1);
          expect(repository.updateCount()).toBe(0);
        });

        it('should answer a conflict after losing the creation race twice', async () => {
          repository.setSearchResult(null);
          repository.setCreateOutcomes('emailTaken', 'emailTaken');

          const result = resolver.resolve(request);

          await expect(result).rejects.toThrow(DomainConflictException);
          await expect(result).rejects.toThrow(CONCURRENT_CHANGE_MESSAGE);
          expect(repository.createdUsers()).toHaveLength(2);
        });

        it('should secure a pending account: validated, no password, only the provider method and no email', async () => {
          const pending = UserMother.pending();
          const before = pending.toPrimitives();
          repository.setSearchResult(pending);

          await resolver.resolve({ ...request, email: pending.email.value });

          const [from, to] = repository.lastUpdate();
          expect(from).toEqual(before);
          expect(to.emailValidated).toBe(true);
          expect(to).not.toHaveProperty('password');
          expect(to).not.toHaveProperty('emailTokens');
          expect(to.authMethods.map(({ provider: p }) => p)).toEqual([
            provider
          ]);
          notifier.assertNothingSent();
        });

        it('should link an active account, keep its password and email the owner', async () => {
          const active = UserMother.active();
          const before = active.toPrimitives();
          repository.setSearchResult(active);

          await resolver.resolve({ ...request, email: active.email.value });

          const [, to] = repository.lastUpdate();
          expect(to.password).toBe(before.password);
          expect(to.authMethods.map(({ provider: p }) => p)).toEqual([
            'local',
            provider
          ]);
          notifier.assertProviderLinkedSentTo(active.email, provider);
        });

        it('should write and send nothing when the same identity is already linked', async () => {
          const stored = UserMother.activeLinkedTo(provider, providerUserId);
          repository.setSearchResult(stored);

          await resolver.resolve({ ...request, email: stored.email.value });

          repository.assertNotWritten();
          notifier.assertNothingSent();
        });

        it('should refuse when the email belongs to an account linked to a different id of the provider', async () => {
          const stored = UserMother.activeLinkedTo(provider, 'another-id');
          repository.setSearchResult(stored);

          const result = resolver.resolve({
            ...request,
            email: stored.email.value
          });

          await expect(result).rejects.toThrow(DomainUnauthorizedException);
          await expect(result).rejects.toThrow(invalidAuthorizationMessage);
          repository.assertNotWritten();
        });

        it('should read the account again and link it once more after a stale write', async () => {
          const active = UserMother.active();
          repository.setSearchResults(
            active,
            UserMother.active({
              id: active.id,
              email: active.email,
              username: active.username
            })
          );
          repository.setUpdateOutcomes('stale', 'written');

          await resolver.resolve({ ...request, email: active.email.value });

          expect(repository.updateCount()).toBe(2);
          notifier.assertProviderLinkedSentTo(active.email, provider);
        });
      });
    }
  );
});
