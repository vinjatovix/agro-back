import {
  buildLogger,
  type OneTimeTokenTool
} from '../../../shared/plugins/index.js';
import { InvalidEmailTokenException } from '../../domain/errors/index.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';

const logger = buildLogger('activateAccount');

export type ActivateAccountRequest = { token: string };

export type ActivateAccountDependencies = {
  authRepository: AuthRepository;
  oneTimeToken: OneTimeTokenTool;
};

/**
 * Validates the email of the account holding the activation token. Every
 * token that cannot do it gets the same refusal, including the loser of two
 * concurrent activations with the same token.
 */
export class ActivateAccount {
  private readonly authRepository: AuthRepository;
  private readonly oneTimeToken: OneTimeTokenTool;

  constructor({ authRepository, oneTimeToken }: ActivateAccountDependencies) {
    this.authRepository = authRepository;
    this.oneTimeToken = oneTimeToken;
  }

  async run({ token }: ActivateAccountRequest): Promise<void> {
    const tokenHash = this.oneTimeToken.hash(token);
    const user = await this.authRepository.searchByEmailToken(
      'activation',
      tokenHash
    );
    if (user === null) {
      throw new InvalidEmailTokenException();
    }

    const before = user.toPrimitives();
    user.activate(tokenHash, new Date());

    const outcome = await this.authRepository.update(
      before,
      user.toPrimitives()
    );
    if (outcome === 'stale') {
      throw new InvalidEmailTokenException();
    }

    logger.info(`User <${user.username.value}> validated email`);
  }
}
