import { makeInvoker } from 'awilix-express';
import type { CreateBedController } from '../../controllers/Beds/CreateBedController.js';
import { bindRun } from '../shared/bindRun.js';
import type { GetUserBedsController } from '../../controllers/Beds/GetUserBedsController.js';
import type { GetBedByIdController } from '../../controllers/Beds/GetBedByIdController.js';
import type { UpdateBedController } from '../../controllers/Beds/UpdateBedController.js';
import type { DeleteBedController } from '../../controllers/Beds/DeleteBedController.js';

const api = (
  createBedController: CreateBedController,
  getUserBedsController: GetUserBedsController,
  getBedController: GetBedByIdController,
  updateBedController: UpdateBedController,
  deleteBedController: DeleteBedController
) => {
  return {
    createBed: bindRun(createBedController),
    listUserBeds: bindRun(getUserBedsController),
    getBedById: bindRun(getBedController),
    updateBed: bindRun(updateBedController),
    deleteBed: bindRun(deleteBedController)
  };
};

export const bedApiInvoker = makeInvoker(api);
