import type { z } from 'zod';

import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';
import type { PaginatedResult } from '../../../shared/domain/query/interfaces/PaginatedResult.js';
import { createError } from '../../../shared/errors/index.js';

// Output check: every body built by a read path is checked against its
// response schema before it is sent. Unknown keys are stripped; a body that
// breaks the contract fails closed (500), and the failing ids are logged with
// the issue paths only, never the stored values.

export type CheckContext = {
  resource: 'Plant' | 'Family';
  logger: AppLogger;
};

type CheckFailure = {
  id: string;
  issues: string[];
};

const issuePaths = (error: z.ZodError): string[] =>
  error.issues.map(
    (issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.code}`
  );

const fail = (context: CheckContext, failures: CheckFailure[]): never => {
  const ids = failures.map(({ id }) => id).join(', ');

  context.logger.error(
    `${context.resource} response does not match the contract: ${ids}`,
    { resource: context.resource, failures }
  );

  throw createError.internal(
    `${context.resource} response does not match the contract`
  );
};

/** Checks one resource; returns the stripped body or throws a 500. */
export const checkResponse = <S extends z.ZodType>(
  schema: S,
  body: unknown,
  context: CheckContext & { id: string }
): z.output<S> => {
  const result = schema.safeParse(body);

  if (result.success) return result.data;

  return fail(context, [{ id: context.id, issues: issuePaths(result.error) }]);
};

/**
 * Checks every item of a page. Any failing item fails the whole page: all
 * failing ids are logged in one entry and nothing is returned.
 */
export const checkPage = <S extends z.ZodType>(
  itemSchema: S,
  page: PaginatedResult<{ id: string }>,
  context: CheckContext
): PaginatedResult<z.output<S>> => {
  const data: z.output<S>[] = [];
  const failures: CheckFailure[] = [];

  for (const item of page.data) {
    const result = itemSchema.safeParse(item);

    if (result.success) {
      data.push(result.data);
    } else {
      failures.push({ id: item.id, issues: issuePaths(result.error) });
    }
  }

  if (failures.length > 0) return fail(context, failures);

  return { data, pagination: page.pagination };
};
