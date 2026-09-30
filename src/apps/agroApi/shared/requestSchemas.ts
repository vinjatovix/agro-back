import { z } from 'zod';

// Declared as `query` on routes that take no query string: the validation step
// makes it strict, so any key is reported as an unknown field.
export const emptyQuery = z.object({});

// Declared as `body` on GET routes: Express 5 leaves `req.body` undefined when
// no body is sent, so a missing body passes and any field is unknown.
export const emptyBody = z.object({}).optional();
