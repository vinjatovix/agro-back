import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../shared/application/utils/ensureVersion.js';
import { DomainConflictException } from '../../../shared/domain/errors/index.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import type { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import type { ManageableRole } from '../../domain/value-objects/UserRoles.js';

const ADMIN_ROLE: ManageableRole = 'admin';

const LAST_ADMINISTRATOR_MESSAGE =
  'Cannot remove the last administrator of the platform';

export type ChangeUserRolesInput = {
  userId: string;
  add: ManageableRole[];
  remove: ManageableRole[];
};

export type ChangeUserRolesDependencies = {
  authRepository: AuthRepository;
};

export class ChangeUserRoles {
  private readonly authRepository: AuthRepository;

  constructor({ authRepository }: ChangeUserRolesDependencies) {
    this.authRepository = authRepository;
  }

  async execute(
    input: ChangeUserRolesInput,
    actingAdminUsername: string,
    expectedVersions: readonly number[]
  ): Promise<UserPrimitives> {
    const user = ensureFound(
      await this.authRepository.searchById(input.userId),
      'User',
      input.userId
    );
    ensureVersion(user.version, expectedVersions, 'User', input.userId);

    await this.ensureNotLastAdmin(user, input.remove);

    const before = user.toPrimitives();
    const at = new Date();

    user.changeRoles(input.add, input.remove, actingAdminUsername, at);

    const after = user.toPrimitives();

    // Always called: an empty diff is still confirmed against storage.
    user.syncVersion(await this.authRepository.updateRoles(before, after));

    return user.toPrimitives();
  }

  /**
   * Last-administrator invariant (FR-007): a delta that would remove `admin`
   * from the only account holding it is refused with 409 before persisting.
   */
  private async ensureNotLastAdmin(
    user: User,
    remove: ManageableRole[]
  ): Promise<void> {
    const removesAdmin =
      remove.includes(ADMIN_ROLE) && user.roles.has(ADMIN_ROLE);
    if (!removesAdmin) {
      return;
    }

    const administrators = await this.authRepository.countByRole(ADMIN_ROLE);
    if (administrators <= 1) {
      throw new DomainConflictException(LAST_ADMINISTRATOR_MESSAGE);
    }
  }
}
