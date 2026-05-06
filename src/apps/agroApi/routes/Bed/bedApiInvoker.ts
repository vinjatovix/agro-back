import { makeInvoker } from 'awilix-express';
import type { CreateBedController } from '../../controllers/Beds/CreateBedController.js';
import type { GetUserBedsController } from '../../controllers/Beds/GetUserBedsController.js';
import type { GetBedByIdController } from '../../controllers/Beds/GetBedByIdController.js';
import type { UpdateBedController } from '../../controllers/Beds/UpdateBedController.js';
import type { DeleteBedController } from '../../controllers/Beds/DeleteBedController.js';

const api = ({
  createBedController,
  getUserBedsController,
  getBedByIdController,
  updateBedController,
  deleteBedController
}: {
  createBedController: CreateBedController;
  getUserBedsController: GetUserBedsController;
  getBedByIdController: GetBedByIdController;
  updateBedController: UpdateBedController;
  deleteBedController: DeleteBedController;
}) => ({
  createBed: createBedController.run,
  listUserBeds: getUserBedsController.run,
  getBedById: getBedByIdController.run,
  updateBed: updateBedController.run,
  deleteBed: deleteBedController.run
});

export const bedApiInvoker = makeInvoker(api);
