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
import { MongoPlantRepository } from '../../Contexts/Agro/Plants/infrastructure/persistence/MongoPlantRepository.js';
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
  GetAllPlantsController,
  GetPlantByIdController
} from './controllers/Plants/index.js';

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
    plantRepository: asClass(MongoPlantRepository).singleton()
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
    ).scoped()
  });
};

const registerPlantControllers = (container: AppContainer): void => {
  container.register({
    createPlantController: asClass(CreatePlantController).scoped(),
    getAllPlantsController: asClass(GetAllPlantsController).scoped(),
    getPlantController: asClass(GetPlantByIdController).scoped()
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

  return container;
};
