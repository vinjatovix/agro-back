import { z } from 'zod';

import { MANAGEABLE_ROLES } from '../../../../Contexts/Auth/domain/value-objects/UserRoles.js';
import { createError } from '../../../../shared/errors/index.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { emptyBody, emptyQuery } from '../../shared/requestSchemas.js';

export const ADD_REMOVE_OVERLAP_MESSAGE =
  'add and remove must not share a role';

export const LOOKUP_EXACTLY_ONE_MESSAGE =
  'Provide exactly one of email or username';

// Only the manageable (elevated) roles are accepted: the base role `user` and
// any unknown name fail the enum as a 400. A later iteration widens the enum.
const manageableRole = z.enum(MANAGEABLE_ROLES);

const userIdParams = z.object({
  userId: z.uuid()
});

/**
 * Role delta over the manageable roles. `{}` is accepted (no-op). `add` and
 * `remove` must be disjoint: an overlap throws a 422 at the transport boundary,
 * before any domain logic (FR-003a). The check runs only after the base parse
 * succeeds, so an unknown or non-manageable role is still a 400.
 */
const changeUserRolesBody = z
  .object({
    add: z.array(manageableRole).exactOptional(),
    remove: z.array(manageableRole).exactOptional()
  })
  .refine((body) => {
    const remove = new Set(body.remove ?? []);
    const overlap = (body.add ?? []).filter((role) => remove.has(role));

    if (overlap.length > 0) {
      throw createError.unprocessableEntity(ADD_REMOVE_OVERLAP_MESSAGE, {
        body: `${ADD_REMOVE_OVERLAP_MESSAGE}: ${overlap.join(', ')}`
      });
    }

    return true;
  });

export const changeUserRolesRequest = {
  params: userIdParams,
  query: emptyQuery,
  body: changeUserRolesBody
} satisfies RequestSchemas;

/** Exactly one of `email` or `username`; neither/both is a 400. */
const lookupUserQuery = z
  .object({
    email: z.email().exactOptional(),
    username: z.string().exactOptional()
  })
  .refine(
    (query) => (query.email === undefined) !== (query.username === undefined),
    { message: LOOKUP_EXACTLY_ONE_MESSAGE }
  );

export const lookupUserRequest = {
  query: lookupUserQuery,
  body: emptyBody
} satisfies RequestSchemas;
