import type { UserPrimitives } from '../../../../Contexts/Auth/domain/entities/types/UserPrimitives.js';
import type { MetadataPrimitives } from '../../../../Contexts/shared/domain/MetadataPrimitives.js';

// Minimal views: every field is selected by hand, so password hashes, auth
// methods, email tokens and email-validation state never reach a response
// (FR-010, FR-011, FR-016).

export type UserRolesView = {
  id: string;
  roles: string[];
  metadata: MetadataPrimitives;
};

export type UserLookupView = {
  id: string;
  username: string;
  email: string;
  roles: string[];
};

export const toUserRolesView = (user: UserPrimitives): UserRolesView => ({
  id: user.id,
  roles: user.roles,
  metadata: user.metadata
});

export const toUserLookupView = (user: UserPrimitives): UserLookupView => ({
  id: user.id,
  username: user.username,
  email: user.email,
  roles: user.roles
});
