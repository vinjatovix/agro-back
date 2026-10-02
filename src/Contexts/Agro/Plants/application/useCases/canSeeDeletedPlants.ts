import type { UserSessionInfo } from '../../../../Auth/application/index.js';

/** Admins and collaborators can read soft-deleted plants; everyone else only active ones. */
export const canSeeDeletedPlants = (
  user: UserSessionInfo | null | undefined
): boolean =>
  user?.roles.some((r) => r === 'admin' || r === 'collaborator') ?? false;
