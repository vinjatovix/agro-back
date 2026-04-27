import type { Request, Response, NextFunction } from 'express';
import { isAdmin } from '../../../../src/apps/agroApi/middlewares/isAdmin.js';
import { EnsureAuthentication } from '../../../../src/apps/agroApi/middlewares/EnsureAuthentication.js';
import type { AppContainer } from '../../../../src/apps/agroApi/container.js';

describe('isAdmin middleware', () => {
  it('should delegate to EnsureAuthentication.isAdministrator', () => {
    const next = jest.fn() as NextFunction;
    const res = {} as Response;

    const isAdminSpy = jest
      .spyOn(EnsureAuthentication, 'isAdministrator')
      .mockImplementation(() => undefined);

    const req = {
      container: {
        resolve: jest.fn().mockReturnValue('logger')
      }
    } as unknown as Request & { container: AppContainer };

    isAdmin(req, res, next);

    expect(isAdminSpy).toHaveBeenCalledWith(
      { logger: 'logger' },
      req,
      res,
      next
    );

    isAdminSpy.mockRestore();
  });
});
