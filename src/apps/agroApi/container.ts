import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer
} from 'awilix';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CheckHealth } from '../../Contexts/health/application/index.js';
import {
  GoogleIdTokenVerifierAdapter,
  buildLogger,
  CryptAdapter,
  type AppLogger
} from '../../Contexts/shared/plugins/index.js';
import {
  DBClientFactory,
  DBConfigFactory,
  DBEnvironmentArranger,
  type DBConfig
} from '../../shared/infrastructure/persistence/index.js';
import { MongoAuthRepository } from '../../Contexts/Auth/infrastructure/persistence/index.js';
import {
  AuthenticateWithGoogle,
  LoginUserLocal,
  RefreshToken,
  RegisterUserLocal,
  UpdatePasswordLocal,
  ValidateMail
} from '../../Contexts/Auth/application/index.js';
import { MongoPlantRepository } from '../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import {
  CreatePlant,
  GetPlant,
  UpdatePlant,
  ListPlants
} from '../../Contexts/Agro/Plants/application/useCases/index.js';
import {
  AuthenticateWithGoogleController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  UpdatePasswordLocalController,
  ValidateMailController
} from './controllers/Auth/index.js';
import { HealthController } from './controllers/health/HealthController.js';
import {
  CreatePlantController,
  DeletePlantController,
  GetAllPlantsController,
  GetPlantByIdController,
  UpdatePlantController
} from './controllers/Plants/index.js';
import { DeletePlant } from '../../Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import { MongoBedRepository } from '../../Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';
import { CreateBedController } from './controllers/Beds/CreateBedController.js';
import { CreateBed } from '../../Contexts/Agro/Beds/application/useCases/CreateBed.js';
import { GetUserBedsController } from './controllers/Beds/GetUserBedsController.js';
import { GetBedByIdController } from './controllers/Beds/GetBedByIdController.js';
import { UpdateBedController } from './controllers/Beds/UpdateBedController.js';
import { ListUserBeds } from '../../Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { UpdateBed } from '../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import { DeleteBedController } from './controllers/Beds/DeleteBedController.js';
import { DeleteBed } from '../../Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import { GetBedById } from '../../Contexts/Agro/Beds/application/useCases/GetBedById.js';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

export type AppContainer = AwilixContainer;

const registerCoreDependencies = (container: AppContainer): void => {
  container.register({
    appVersion: asValue(pkg.version),
    logger: asValue<AppLogger>(buildLogger('agroApi')),
    healthController: asClass(HealthController).scoped(),
    checkHealth: asClass(CheckHealth).scoped()
  });
};

const registerInfrastructureDependencies = (container: AppContainer): void => {
  container.register({
    DBConfig: asFunction(() => DBConfigFactory.createConfig()).singleton(),
    DBClient: asFunction((DBConfig: DBConfig) =>
      DBClientFactory.createClient('agroApi', DBConfig)
    ).singleton(),
    environmentArranger: asClass(DBEnvironmentArranger).singleton(),
    encrypter: asClass(CryptAdapter).singleton(),
    googleIdTokenVerifier: asClass(GoogleIdTokenVerifierAdapter).singleton(),
    authRepository: asClass(MongoAuthRepository).singleton(),
    plantRepository: asClass(MongoPlantRepository).singleton(),
    bedRepository: asClass(MongoBedRepository).singleton()
  });
};
const registerAuthControllers = (container: AppContainer): void => {
  container.register({
    registerUserController: asClass(RegisterUserLocalController).scoped(),
    loginUserController: asClass(LoginUserLocalController).scoped(),
    authenticateWithGoogleController: asClass(
      AuthenticateWithGoogleController
    ).scoped(),
    validateMailController: asClass(ValidateMailController).scoped(),
    refreshTokenController: asClass(RefreshTokenController).scoped(),
    updatePasswordController: asClass(UpdatePasswordLocalController).scoped()
  });
};

const registerAuthUseCases = (container: AppContainer): void => {
  container.register({
    registerUser: asFunction(
      (authRepository, encrypter) =>
        new RegisterUserLocal(authRepository, encrypter)
    ).scoped(),
    loginUser: asFunction(
      (authRepository, encrypter) =>
        new LoginUserLocal(authRepository, encrypter)
    ).scoped(),
    authenticateWithGoogle: asFunction(
      (authRepository, encrypter, googleIdTokenVerifier) =>
        new AuthenticateWithGoogle(
          authRepository,
          encrypter,
          googleIdTokenVerifier
        )
    ).scoped(),
    validateMail: asFunction(
      (authRepository, encrypter) => new ValidateMail(authRepository, encrypter)
    ).scoped(),
    refreshToken: asFunction(
      (encrypter) => new RefreshToken(encrypter)
    ).scoped(),
    updatePassword: asFunction(
      (authRepository, encrypter) =>
        new UpdatePasswordLocal(authRepository, encrypter)
    ).scoped()
  });
};

const registerPlantControllers = (container: AppContainer): void => {
  container.register({
    createPlantController: asFunction(
      (createPlant) => new CreatePlantController(createPlant)
    ).scoped(),
    getAllPlantsController: asFunction(
      (listPlants) => new GetAllPlantsController(listPlants)
    ).scoped(),
    getPlantController: asFunction(
      (getPlant) => new GetPlantByIdController(getPlant)
    ).scoped(),
    updatePlantController: asFunction(
      (updatePlant) => new UpdatePlantController(updatePlant)
    ).scoped(),
    deletePlantController: asFunction(
      (deletePlant) => new DeletePlantController(deletePlant)
    ).scoped()
  });
};

const registerPlantUseCases = (container: AppContainer): void => {
  container.register({
    createPlant: asFunction(
      (plantRepository) => new CreatePlant(plantRepository)
    ).scoped(),
    getPlant: asFunction(
      (plantRepository) => new GetPlant(plantRepository)
    ).scoped(),
    listPlants: asFunction(
      (plantRepository) => new ListPlants(plantRepository)
    ).scoped(),
    updatePlant: asFunction(
      (plantRepository) => new UpdatePlant(plantRepository)
    ).scoped(),
    deletePlant: asFunction(
      (plantRepository) => new DeletePlant(plantRepository)
    ).scoped()
  });
};

const registerBedControllers = (container: AppContainer): void => {
  container.register({
    createBedController: asFunction(
      (createBed) => new CreateBedController(createBed)
    ).scoped(),
    getUserBedsController: asFunction(
      (listUserBeds) => new GetUserBedsController(listUserBeds)
    ).scoped(),
    getBedController: asFunction(
      (getBed) => new GetBedByIdController(getBed)
    ).scoped(),
    updateBedController: asFunction(
      (updateBed) => new UpdateBedController(updateBed)
    ).scoped(),
    deleteBedController: asFunction(
      (deleteBed) => new DeleteBedController(deleteBed)
    ).scoped()
  });
};

const registerBedUseCases = (container: AppContainer): void => {
  container.register({
    createBed: asFunction(
      (bedRepository) => new CreateBed(bedRepository)
    ).scoped(),
    listUserBeds: asFunction(
      (bedRepository) => new ListUserBeds(bedRepository)
    ).scoped(),
    getBed: asFunction(
      (bedRepository) => new GetBedById(bedRepository)
    ).scoped(),
    updateBed: asFunction(
      (bedRepository) => new UpdateBed(bedRepository)
    ).scoped(),
    deleteBed: asFunction(
      (bedRepository) => new DeleteBed(bedRepository)
    ).scoped()
  });
};

export const createAppContainer = (): AppContainer => {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
  });

  registerCoreDependencies(container);
  registerInfrastructureDependencies(container);
  registerAuthControllers(container);
  registerAuthUseCases(container);
  registerPlantControllers(container);
  registerPlantUseCases(container);
  registerBedControllers(container);
  registerBedUseCases(container);

  return container;
};
