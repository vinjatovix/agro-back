import { ActivateAccount } from '../../../../../src/Contexts/Auth/application/index.js';
import { InvalidEmailTokenException } from '../../../../../src/Contexts/Auth/domain/errors/index.js';
import { OneTimeTokenToolMock } from '../../../shared/__mocks__/OneTimeTokenToolMock.js';
import { AuthRepositoryMock } from '../../__mocks__/index.js';
import { EmailTokenMother } from '../../domain/mothers/EmailTokenMother.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('ActivateAccount', () => {
  let repository: AuthRepositoryMock;
  let oneTimeToken: OneTimeTokenToolMock;
  let activateAccount: ActivateAccount;
  let token: string;
  let tokenHash: string;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    oneTimeToken = new OneTimeTokenToolMock();
    activateAccount = new ActivateAccount({
      authRepository: repository,
      oneTimeToken
    });
    ({ token, tokenHash } = oneTimeToken.generate());
  });

  it('should validate the email of the account holding the token and use it up', async () => {
    const user = UserMother.pending({
      token: EmailTokenMother.activation({ tokenHash })
    });
    const before = user.toPrimitives();
    repository.setSearchByEmailTokenResult(user);

    await expect(activateAccount.run({ token })).resolves.toBeUndefined();

    repository.assertSearchByEmailTokenHasBeenCalledWith(
      'activation',
      tokenHash
    );
    const [updatedFrom, updatedTo] = repository.lastUpdate();
    expect(updatedFrom).toEqual(before);
    expect(updatedTo.emailValidated).toBe(true);
    expect(updatedTo).not.toHaveProperty('emailTokens');
  });

  it('should never hand the plain token to the repository', async () => {
    repository.setSearchByEmailTokenResult(
      UserMother.pending({ token: EmailTokenMother.activation({ tokenHash }) })
    );
    const searchSpy = jest.spyOn(repository, 'searchByEmailToken');

    await activateAccount.run({ token });

    expect(JSON.stringify(searchSpy.mock.calls)).not.toContain(token);
    expect(JSON.stringify(repository.lastUpdate())).not.toContain(token);
  });

  it.each([
    ['no account holds the token', () => null],
    [
      'the token expired',
      () =>
        UserMother.pending({
          token: EmailTokenMother.activation({
            tokenHash,
            expiresAt: new Date(Date.now() - 1000)
          })
        })
    ],
    [
      'the account is already active',
      () =>
        UserMother.create({
          emailValidated: true,
          emailTokens: [EmailTokenMother.activation({ tokenHash })]
        })
    ]
  ])('should refuse when %s, writing nothing', async (_case, found) => {
    repository.setSearchByEmailTokenResult(found());

    await expect(activateAccount.run({ token })).rejects.toThrow(
      InvalidEmailTokenException
    );
    repository.assertNotWritten();
  });

  it('should refuse the loser of two concurrent activations', async () => {
    repository.setSearchByEmailTokenResult(
      UserMother.pending({ token: EmailTokenMother.activation({ tokenHash }) })
    );
    repository.setUpdateOutcomes('stale');

    await expect(activateAccount.run({ token })).rejects.toThrow(
      InvalidEmailTokenException
    );
  });
});
