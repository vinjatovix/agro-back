import type { Response } from 'express';

export const setVersionETag = (res: Response, version: number): void => {
  res.set('ETag', `"${version}"`);
};
