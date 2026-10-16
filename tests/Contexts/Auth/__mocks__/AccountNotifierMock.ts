import type { AccountNotifier } from '../../../../src/Contexts/Auth/application/notifications/index.js';
import type { AuthProvider } from '../../../../src/Contexts/Auth/domain/value-objects/types/index.js';
import type { Email } from '../../../../src/Contexts/shared/domain/valueObject/index.js';

export class AccountNotifierMock implements AccountNotifier {
  readonly activation = jest.fn<void, [Email, string]>();
  readonly registrationAttempt = jest.fn<void, [Email]>();
  readonly providerLinked = jest.fn<void, [Email, AuthProvider, Date]>();

  assertActivationSentTo(email: Email, token: string): void {
    expect(this.activation).toHaveBeenCalledTimes(1);
    expect(this.activation).toHaveBeenCalledWith(email, token);
  }

  assertRegistrationAttemptSentTo(email: Email): void {
    expect(this.registrationAttempt).toHaveBeenCalledTimes(1);
    expect(this.registrationAttempt).toHaveBeenCalledWith(email);
  }

  assertProviderLinkedSentTo(email: Email, provider: AuthProvider): void {
    expect(this.providerLinked).toHaveBeenCalledTimes(1);
    expect(this.providerLinked).toHaveBeenCalledWith(
      email,
      provider,
      expect.any(Date)
    );
  }

  assertNothingSent(): void {
    expect(this.activation).not.toHaveBeenCalled();
    expect(this.registrationAttempt).not.toHaveBeenCalled();
    expect(this.providerLinked).not.toHaveBeenCalled();
  }
}
