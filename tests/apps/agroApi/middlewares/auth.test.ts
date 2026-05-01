import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../../../src/apps/agroApi/middlewares/auth.js';
import { EnsureAuthentication } from '../../../../src/apps/agroApi/middlewares/EnsureAuthentication.js';

describe('auth middleware', () => {
  it('should call EnsureAuthentication.run', () => {
    const req = {
      container: {
        resolve: jest.fn().mockReturnValue('logger')
      }
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    const runSpy = jest.spyOn(EnsureAuthentication, 'run').mockResolvedValue();

    auth(req, res, next);

    expect(runSpy).toHaveBeenCalled();

    runSpy.mockRestore();
  });
});
