import httpStatus from 'http-status';

import {
  DomainException,
  type DomainExceptionConstructor,
  InvalidArgumentException,
  DomainNotFoundException,
  DomainConflictException,
  DomainUnauthorizedException,
  DomainForbiddenException
} from '../../../../Contexts/shared/domain/errors/index.js';

const DOMAIN_EXCEPTION_MAP = new Map<DomainExceptionConstructor, number>([
  [InvalidArgumentException, httpStatus.BAD_REQUEST],
  [DomainNotFoundException, httpStatus.NOT_FOUND],
  [DomainConflictException, httpStatus.CONFLICT],
  [DomainUnauthorizedException, httpStatus.UNAUTHORIZED],
  [DomainForbiddenException, httpStatus.FORBIDDEN]
]);

export const domainExceptionMapper = (
  err: DomainException
): number | undefined => {
  const directStatus = DOMAIN_EXCEPTION_MAP.get(
    err.constructor as DomainExceptionConstructor
  );
  if (directStatus !== undefined) {
    return directStatus;
  }

  for (const [exceptionClass, status] of DOMAIN_EXCEPTION_MAP.entries()) {
    if (err instanceof exceptionClass) {
      return status;
    }
  }
  return undefined;
};
