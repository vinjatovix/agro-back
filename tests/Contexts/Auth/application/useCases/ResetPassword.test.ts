import { ResetPassword } from '../../../../../src/Contexts/Auth/application/useCases/ResetPassword.js';
import type { UserPrimitives } from '../../../../../src/Contexts/Auth/domain/entities/types/UserPrimitives.js';
import { InvalidEmailTokenException } from '../../../../../src/Contexts/Auth/domain/errors/index.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { OneTimeTokenToolMock } from '../../../shared/__mocks__/OneTimeTokenToolMock.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock,
  EncrypterAdapterMock,
  MOCK_PASSWORD_HASH
} from '../../__mocks__/index.js';
import { EmailTokenMother } from '../../domain/mothers/EmailTokenMother.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

const NEW_PASSWORD = 'NewPassword1!';

describe('ResetPassword', () => {
  let repository: AuthRepositoryMock;
  let encrypter: EncrypterAdapterMock;
  let oneTimeToken: OneTimeTokenToolMock;
  let notifier: AccountNotifierMock;
  let resetPassword: ResetPassword;
  let token: string;
  let tokenHash: string;

  const runWithNewPassword = (): Promise<void> =>
    resetPassword.run({
      token,
      password: NEW_PASSWORD,
      repeatPassword: NEW_PASSWORD
    });

  /** The hash of the new password is the one stored, top level and local. */
  const expectNewPasswordStored = (updatedTo: UserPrimitives): void => {
    encrypter.assertHashHasBeenCalledWith(NEW_PASSWORD);
    expect(updatedTo.password).toBe(MOCK_PASSWORD_HASH);
    expect(
      updatedTo.authMethods?.find((method) => method.provider === 'local')
        ?.password
    ).toBe(MOCK_PASSWORD_HASH);
  };

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    encrypter = new EncrypterAdapterMock();
    oneTimeToken = new OneTimeTokenToolMock();
    notifier = new AccountNotifierMock();
    resetPassword = new ResetPassword({
      authRepository: repository,
      encrypter,
      oneTimeToken,
      accountNotifier: notifier
    });
    ({ token, tokenHash } = oneTimeToken.generate());
  });

  it('should store the new password of an active account, use up the token and send a notice', async () => {
    const user = UserMother.activeWithResetToken(
      EmailTokenMother.passwordReset({ tokenHash })
    );
    repository.setSearchByEmailTokenResult(user);

    await runWithNewPassword();

    repository.assertSearchByEmailTokenHasBeenCalledWith(
      'passwordReset',
      tokenHash
    );
    const [, updatedTo] = repository.lastUpdate();
    expectNewPasswordStored(updatedTo);
    expect(updatedTo.emailValidated).toBe(true);
    expect(updatedTo).not.toHaveProperty('emailTokens');
    notifier.assertPasswordChangedSentTo(user.email);
  });

  it('should add a local password to a Google-only account and keep its Google identity', async () => {
    const providerUserId = 'google-sub-reset';
    const user = UserMother.googleOnlyWithResetToken(
      EmailTokenMother.passwordReset({ tokenHash }),
      providerUserId
    );
    repository.setSearchByEmailTokenResult(user);

    await runWithNewPassword();

    const [, updatedTo] = repository.lastUpdate();
    expectNewPasswordStored(updatedTo);
    expect(updatedTo.authMethods).toHaveLength(2);
    expect(updatedTo.authMethods).toContainEqual(
      expect.objectContaining({ provider: 'google', providerUserId })
    );
    notifier.assertPasswordChangedSentTo(user.email);
  });

  it('should validate a pending account, replace its password and drop its activation token', async () => {
    const user = UserMother.pendingWithResetToken(
      EmailTokenMother.passwordReset({ tokenHash })
    );
    repository.setSearchByEmailTokenResult(user);

    await runWithNewPassword();

    const [, updatedTo] = repository.lastUpdate();
    expectNewPasswordStored(updatedTo);
    expect(updatedTo.emailValidated).toBe(true);
    expect(updatedTo).not.toHaveProperty('emailTokens');
    notifier.assertPasswordChangedSentTo(user.email);
  });

  it.each([
    ['breaks the password rules', 'weak', 'weak'],
    ['does not match its confirmation', NEW_PASSWORD, 'DifferentPassword1!']
  ])(
    'should refuse a password that %s before looking the token up',
    async (_case, password, repeatPassword) => {
      const searchSpy = jest.spyOn(repository, 'searchByEmailToken');

      await expect(
        resetPassword.run({ token, password, repeatPassword })
      ).rejects.toThrow(InvalidArgumentException);

      expect(searchSpy).not.toHaveBeenCalled();
      repository.assertNotWritten();
      notifier.assertNothingSent();
    }
  );

  it.each([
    ['no account holds the reset token', () => null],
    [
      'the reset token expired',
      () =>
        UserMother.activeWithResetToken(
          EmailTokenMother.passwordReset({
            tokenHash,
            expiresAt: new Date(Date.now() - 1000)
          })
        )
    ],
    ['the account found no longer holds that token', () => UserMother.active()]
  ])('should refuse when %s, writing nothing', async (_case, found) => {
    repository.setSearchByEmailTokenResult(found());

    await expect(runWithNewPassword()).rejects.toThrow(
      InvalidEmailTokenException
    );

    repository.assertNotWritten();
    notifier.assertNothingSent();
  });

  it('should refuse the loser of two concurrent resets and send no notice', async () => {
    const user = UserMother.activeWithResetToken(
      EmailTokenMother.passwordReset({ tokenHash })
    );
    repository.setSearchByEmailTokenResult(user);
    repository.setUpdateOutcomes('stale');

    await expect(runWithNewPassword()).rejects.toThrow(
      InvalidEmailTokenException
    );

    expect(repository.updateCount()).toBe(1);
    notifier.assertNothingSent();
  });
});
