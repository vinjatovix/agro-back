import { ForgotPassword } from '../../../../../src/Contexts/Auth/application/useCases/ForgotPassword.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { BackgroundTasksFake } from '../../../shared/__mocks__/BackgroundTasksFake.js';
import { OneTimeTokenToolMock } from '../../../shared/__mocks__/OneTimeTokenToolMock.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock
} from '../../__mocks__/index.js';
import { EmailTokenMother } from '../../domain/mothers/EmailTokenMother.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('ForgotPassword', () => {
  let repository: AuthRepositoryMock;
  let oneTimeToken: OneTimeTokenToolMock;
  let notifier: AccountNotifierMock;
  let backgroundTasks: BackgroundTasksFake;
  let forgotPassword: ForgotPassword;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    oneTimeToken = new OneTimeTokenToolMock();
    notifier = new AccountNotifierMock();
    backgroundTasks = new BackgroundTasksFake();
    forgotPassword = new ForgotPassword({
      authRepository: repository,
      oneTimeToken,
      accountNotifier: notifier,
      backgroundTasks
    });
  });

  it('should store the hash of the token it emails to the owner of an existing account', async () => {
    const user = UserMother.active();
    repository.setSearchResult(user);

    await forgotPassword.run({ email: user.email.value });
    await backgroundTasks.idle();

    const { token, tokenHash } = oneTimeToken.lastGenerated();
    const [, updatedTo] = repository.lastUpdate();
    expect(updatedTo.emailTokens).toEqual([
      expect.objectContaining({ purpose: 'passwordReset', tokenHash })
    ]);
    expect(JSON.stringify(updatedTo)).not.toContain(token);
    notifier.assertPasswordResetSentTo(user.email, token);
  });

  it('should name the background task by the email domain only', async () => {
    const user = UserMother.active();
    repository.setSearchResult(user);

    await forgotPassword.run({ email: user.email.value });

    const [local, domain] = user.email.value.split('@');
    expect(backgroundTasks.labels).toEqual([`Password reset for ${domain}`]);
    expect(backgroundTasks.labels[0]).not.toContain(`${local}@`);
  });

  it('should send no email when a concurrent change leaves the token unstored', async () => {
    const user = UserMother.active();
    repository.setSearchResult(user);
    repository.setUpdateOutcomes('stale');

    await forgotPassword.run({ email: user.email.value });
    await backgroundTasks.idle();

    expect(repository.updateCount()).toBe(1);
    notifier.assertNothingSent();
  });

  it('should take no action and schedule no tasks for an unknown email', async () => {
    repository.setSearchResult(null);

    await forgotPassword.run({ email: 'unknown@example.com' });
    await backgroundTasks.idle();

    expect(backgroundTasks.labels).toHaveLength(0);
    notifier.assertNothingSent();
    repository.assertNotWritten();
  });

  it('should reject an invalid email format synchronously', async () => {
    await expect(
      forgotPassword.run({ email: 'invalid-email' })
    ).rejects.toThrow(InvalidArgumentException);

    expect(backgroundTasks.labels).toHaveLength(0);
    notifier.assertNothingSent();
    repository.assertNotWritten();
  });

  it('should throttle reset requests if a token was issued less than 2 minutes ago', async () => {
    const issuedAt = new Date();
    const recentToken = EmailTokenMother.passwordReset({
      expiresAt: new Date(issuedAt.getTime() + 30 * 60 * 1000)
    });
    const user = UserMother.activeWithResetToken(recentToken);
    repository.setSearchResult(user);

    await forgotPassword.run({ email: user.email.value });
    await backgroundTasks.idle();

    repository.assertNotWritten();
    notifier.assertNothingSent();
  });

  it('should issue a new token replacing the prior one if the prior token is older than 2 minutes', async () => {
    const issuedAt = new Date(Date.now() - 5 * 60 * 1000);
    const oldToken = EmailTokenMother.passwordReset({
      expiresAt: new Date(issuedAt.getTime() + 30 * 60 * 1000)
    });
    const user = UserMother.activeWithResetToken(oldToken);
    repository.setSearchResult(user);

    await forgotPassword.run({ email: user.email.value });
    await backgroundTasks.idle();

    const { token, tokenHash } = oneTimeToken.lastGenerated();
    const [, updatedTo] = repository.lastUpdate();
    expect(updatedTo.emailTokens).toEqual([
      expect.objectContaining({ purpose: 'passwordReset', tokenHash })
    ]);
    expect(tokenHash).not.toBe(oldToken.tokenHash);
    notifier.assertPasswordResetSentTo(user.email, token);
  });
});
