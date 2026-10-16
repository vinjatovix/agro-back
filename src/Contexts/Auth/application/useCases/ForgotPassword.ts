import type { BackgroundTasks } from '../../../shared/application/background/index.js';
import { Email } from '../../../shared/domain/valueObject/index.js';
import type { OneTimeTokenTool } from '../../../shared/plugins/index.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import { EmailToken } from '../../domain/value-objects/EmailToken.js';
import type { AccountNotifier } from '../notifications/index.js';

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordDependencies = {
  authRepository: AuthRepository;
  oneTimeToken: OneTimeTokenTool;
  accountNotifier: AccountNotifier;
  backgroundTasks: BackgroundTasks;
};

export class ForgotPassword {
  private readonly authRepository: AuthRepository;
  private readonly oneTimeToken: OneTimeTokenTool;
  private readonly accountNotifier: AccountNotifier;
  private readonly backgroundTasks: BackgroundTasks;

  constructor({
    authRepository,
    oneTimeToken,
    accountNotifier,
    backgroundTasks
  }: ForgotPasswordDependencies) {
    this.authRepository = authRepository;
    this.oneTimeToken = oneTimeToken;
    this.accountNotifier = accountNotifier;
    this.backgroundTasks = backgroundTasks;
  }

  async run({ email }: ForgotPasswordRequest): Promise<void> {
    const emailVO = new Email(email);
    const user = await this.authRepository.search(emailVO.value);
    if (user === null) {
      return;
    }

    const domain = user.email.value.split('@')[1] ?? '';

    this.backgroundTasks.run(`Password reset for ${domain}`, async () => {
      const now = new Date();
      if (user.hasRecentResetToken(now)) {
        return;
      }

      const { token, tokenHash } = this.oneTimeToken.generate();
      const before = user.toPrimitives();
      user.issueEmailToken(EmailToken.passwordReset(tokenHash, now), now);

      // A concurrent change left the token unstored: its link would not work.
      const outcome = await this.authRepository.update(
        before,
        user.toPrimitives()
      );
      if (outcome === 'stale') return;

      this.accountNotifier.passwordReset(user.email, token);
    });
  }
}
