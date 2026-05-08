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
  ValidateMailController,
  type AuthenticateWithGoogleControllerDependencies,
  type LoginUserLocalControllerDependencies,
  type RefreshTokenControllerDependencies,
  type RegisterUserLocalControllerDependencies,
  type UpdatePasswordLocalControllerDependencies,
  type ValidateMailControllerDependencies
} from './controllers/Auth/index.js';
import {
  HealthController,
  type HealthControllerDependencies
  // type HealthControllerDependencies
} from './controllers/health/HealthController.js';
import {
  CreatePlantController,
  DeletePlantController,
  GetAllPlantsController,
  GetPlantByIdController,
  UpdatePlantController,
  type CreatePlantControllerDependencies,
  type DeletePlantControllerDependencies,
  type GetAllPlantsControllerDependencies,
  type GetPlantByIdControllerDependencies,
  type UpdatePlantControllerDependencies
} from './controllers/Plants/index.js';
import { DeletePlant } from '../../Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import { MongoBedRepository } from '../../Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';
import {
  CreateBedController,
  type CreateBedControllerDependencies
} from './controllers/Beds/CreateBedController.js';
import { CreateBed } from '../../Contexts/Agro/Beds/application/useCases/CreateBed.js';
import {
  GetUserBedsController,
  type GetUserBedsControllerDependencies
} from './controllers/Beds/GetUserBedsController.js';
import {
  GetBedByIdController,
  type GetBedByIdControllerDependencies
} from './controllers/Beds/GetBedByIdController.js';
import {
  UpdateBedController,
  type UpdateBedControllerDependencies
} from './controllers/Beds/UpdateBedController.js';
import { ListUserBeds } from '../../Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { UpdateBed } from '../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import {
  DeleteBedController,
  type DeleteBedControllerDependencies
} from './controllers/Beds/DeleteBedController.js';
import { DeleteBed } from '../../Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import { GetBedById } from '../../Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { MongoFamilyRepository } from '../../Contexts/Agro/Families/infrastructure/persistence/MongoFamilyRepository.js';
import type { Db, MongoClient } from 'mongodb';
import { bedPersistenceMapper } from '../../Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { plantPersistenceMapper } from '../../Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { CreateFamily } from '../../Contexts/Agro/Families/application/useCases/CreateFamily.js';
import {
  CreateFamilyController,
  type CreateFamilyControllerDependencies
} from './controllers/Families/CreateFamilyController.js';
import { familyPersistenceMapper } from '../../Contexts/Agro/Families/mappers/familyPersistenceMapper.js';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

type ContainerCradle = {
  // core dependencies
  appVersion: string;

  // Infra dependencies
  DBConfig: DBConfig;
  DBClient: Promise<MongoClient>;
  environmentArranger: DBEnvironmentArranger;

  // Health UseCases
  checkHealth: CheckHealth;

  // Health Controllers
  healthController: HealthController;

  // Auth Repository
  authRepository: MongoAuthRepository;

  // Auth UseCases
  loginUser: LoginUserLocal;
  registerUser: RegisterUserLocal;
  authenticateWithGoogle: AuthenticateWithGoogle;
  validateMail: ValidateMail;
  refreshToken: RefreshToken;
  updatePassword: UpdatePasswordLocal;

  // Auth Controllers
  loginUserController: LoginUserLocalController;
  registerUserController: RegisterUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  validateMailController: ValidateMailController;
  refreshTokenController: RefreshTokenController;
  updatePasswordController: UpdatePasswordLocalController;

  // Family Repository
  familyRepository: MongoFamilyRepository;

  // Family UseCases
  createFamily: CreateFamily;

  // Family Controllers
  createFamilyController: CreateFamilyController;

  // Plant Repository
  plantRepository: MongoPlantRepository;

  // Plant UseCases
  createPlant: CreatePlant;
  getPlant: GetPlant;
  listPlants: ListPlants;
  updatePlant: UpdatePlant;
  deletePlant: DeletePlant;

  // Plant Controllers
  createPlantController: CreatePlantController;
  getAllPlantsController: GetAllPlantsController;
  getPlantController: GetPlantByIdController;
  updatePlantController: UpdatePlantController;
  deletePlantController: DeletePlantController;

  // Bed Repository
  bedRepository: MongoBedRepository;

  // Bed UseCases
  createBed: CreateBed;
  listUserBeds: ListUserBeds;
  getBedById: GetBedById;
  updateBed: UpdateBed;
  deleteBed: DeleteBed;

  // Bed Controllers
  createBedController: CreateBedController;
  getUserBedsController: GetUserBedsController;
  getBedByIdController: GetBedByIdController;
  updateBedController: UpdateBedController;
  deleteBedController: DeleteBedController;
};

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

export type AppContainer = AwilixContainer<ContainerCradle>;

const registerCoreDependencies = (container: AppContainer): void => {
  container.register({
    appVersion: asValue(pkg.version),
    logger: asValue<AppLogger>(buildLogger('agroApi'))
  });
};

const registerHealthUseCase = (container: AppContainer): void => {
  container.register({
    checkHealth: asFunction(
      ({ appVersion }) => new CheckHealth(appVersion)
    ).scoped()
  });
};

const registerHealthController = (container: AppContainer): void => {
  container.register({
    healthController: asFunction(
      ({ checkHealth }: HealthControllerDependencies) =>
        new HealthController({ checkHealth })
    ).scoped()
  });
};
const registerPersistenceMappers = (container: AppContainer): void => {
  container.register({
    familyPersistenceMapper: asValue(familyPersistenceMapper),
    plantPersistenceMapper: asValue(plantPersistenceMapper),
    bedPersistenceMapper: asValue(bedPersistenceMapper)
  });
};

const registerInfrastructureDependencies = (
  container: AppContainer,
  db: Db,
  client: MongoClient
): void => {
  container.register({
    DBClient: asValue(client),
    db: asValue(db),
    environmentArranger: asClass(DBEnvironmentArranger).singleton(),
    encrypter: asClass(CryptAdapter).singleton(),
    googleIdTokenVerifier: asClass(GoogleIdTokenVerifierAdapter).singleton(),

    authRepository: asValue(new MongoAuthRepository(db)),
    plantRepository: asFunction(
      ({ db, plantPersistenceMapper }) =>
        new MongoPlantRepository(db, plantPersistenceMapper)
    ).singleton(),
    bedRepository: asFunction(
      ({ db, bedPersistenceMapper }) =>
        new MongoBedRepository(db, bedPersistenceMapper)
    ).singleton(),
    familyRepository: asFunction(
      ({ db, familyPersistenceMapper }) =>
        new MongoFamilyRepository(db, familyPersistenceMapper)
    ).singleton()
  });
};

const registerAuthUseCases = (container: AppContainer): void => {
  container.register({
    registerUser: asFunction(
      ({ authRepository, encrypter }) =>
        new RegisterUserLocal(authRepository, encrypter)
    ).scoped(),
    loginUser: asFunction(
      ({ authRepository, encrypter }) =>
        new LoginUserLocal(authRepository, encrypter)
    ).scoped(),
    authenticateWithGoogle: asFunction(
      ({ authRepository, encrypter, googleIdTokenVerifier }) =>
        new AuthenticateWithGoogle(
          authRepository,
          encrypter,
          googleIdTokenVerifier
        )
    ).scoped(),
    validateMail: asFunction(
      ({ authRepository, encrypter }) =>
        new ValidateMail(authRepository, encrypter)
    ).scoped(),
    refreshToken: asFunction(
      ({ encrypter }) => new RefreshToken(encrypter)
    ).scoped(),
    updatePassword: asFunction(
      ({ authRepository, encrypter }) =>
        new UpdatePasswordLocal(authRepository, encrypter)
    ).scoped()
  });
};

const registerAuthControllers = (container: AppContainer): void => {
  container.register({
    registerUserController: asFunction(
      ({ registerUser }: RegisterUserLocalControllerDependencies) =>
        new RegisterUserLocalController({ registerUser })
    ).scoped(),

    loginUserController: asFunction(
      ({ loginUser }: LoginUserLocalControllerDependencies) => {
        return new LoginUserLocalController({
          loginUser
        });
      }
    ).scoped(),

    authenticateWithGoogleController: asFunction(
      ({
        authenticateWithGoogle
      }: AuthenticateWithGoogleControllerDependencies) =>
        new AuthenticateWithGoogleController({ authenticateWithGoogle })
    ).scoped(),

    validateMailController: asFunction(
      ({ validateMail }: ValidateMailControllerDependencies) =>
        new ValidateMailController({ validateMail })
    ).scoped(),

    refreshTokenController: asFunction(
      ({ refreshToken }: RefreshTokenControllerDependencies) =>
        new RefreshTokenController({ refreshToken })
    ).scoped(),

    updatePasswordController: asFunction(
      ({ updatePassword }: UpdatePasswordLocalControllerDependencies) =>
        new UpdatePasswordLocalController({ updatePassword })
    ).scoped()
  });
};

const registerFamilyUseCases = (container: AppContainer): void => {
  container.register({
    createFamily: asFunction(
      ({ familyRepository }) => new CreateFamily(familyRepository)
    ).scoped()
  });
};

const registerFamilyControllers = (container: AppContainer): void => {
  container.register({
    createFamilyController: asFunction(
      ({ createFamily }: CreateFamilyControllerDependencies) =>
        new CreateFamilyController({ createFamily })
    ).scoped()
  });
};

const registerPlantUseCases = (container: AppContainer): void => {
  container.register({
    createPlant: asFunction(
      ({ plantRepository, familyRepository }) =>
        new CreatePlant(plantRepository, familyRepository)
    ).scoped(),
    getPlant: asFunction(
      ({ plantRepository }) => new GetPlant(plantRepository)
    ).scoped(),
    listPlants: asFunction(
      ({ plantRepository }) => new ListPlants(plantRepository)
    ).scoped(),
    updatePlant: asFunction(
      ({ plantRepository, familyRepository }) =>
        new UpdatePlant(plantRepository, familyRepository)
    ).scoped(),
    deletePlant: asFunction(
      ({ plantRepository }) => new DeletePlant(plantRepository)
    ).scoped()
  });
};

const registerPlantControllers = (container: AppContainer): void => {
  container.register({
    createPlantController: asFunction(
      ({ createPlant }: CreatePlantControllerDependencies) =>
        new CreatePlantController({ createPlant })
    ).scoped(),

    getAllPlantsController: asFunction(
      ({ listPlants }: GetAllPlantsControllerDependencies) =>
        new GetAllPlantsController({ listPlants })
    ).scoped(),

    getPlantController: asFunction(
      ({ getPlant }: GetPlantByIdControllerDependencies) =>
        new GetPlantByIdController({ getPlant })
    ).scoped(),

    updatePlantController: asFunction(
      ({ updatePlant }: UpdatePlantControllerDependencies) =>
        new UpdatePlantController({ updatePlant })
    ).scoped(),

    deletePlantController: asFunction(
      ({ deletePlant }: DeletePlantControllerDependencies) =>
        new DeletePlantController({ deletePlant })
    ).scoped()
  });
};

const registerBedUseCases = (container: AppContainer): void => {
  container.register({
    createBed: asFunction(
      ({ bedRepository }) => new CreateBed(bedRepository)
    ).scoped(),

    listUserBeds: asFunction(
      ({ bedRepository }) => new ListUserBeds(bedRepository)
    ).scoped(),

    getBedById: asFunction(
      ({ bedRepository }) => new GetBedById(bedRepository)
    ).scoped(),

    updateBed: asFunction(
      ({ bedRepository }) => new UpdateBed(bedRepository)
    ).scoped(),

    deleteBed: asFunction(
      ({ bedRepository }) => new DeleteBed(bedRepository)
    ).scoped()
  });
};

const registerBedControllers = (container: AppContainer): void => {
  container.register({
    createBedController: asFunction(
      ({ createBed }: CreateBedControllerDependencies) =>
        new CreateBedController({ createBed })
    ).scoped(),

    getUserBedsController: asFunction(
      ({ listUserBeds }: GetUserBedsControllerDependencies) =>
        new GetUserBedsController({ listUserBeds })
    ).scoped(),

    getBedByIdController: asFunction(
      ({ getBedById }: GetBedByIdControllerDependencies) =>
        new GetBedByIdController({ getBedById })
    ).scoped(),

    updateBedController: asFunction(
      ({ updateBed }: UpdateBedControllerDependencies) =>
        new UpdateBedController({ updateBed })
    ).scoped(),

    deleteBedController: asFunction(
      ({ deleteBed }: DeleteBedControllerDependencies) =>
        new DeleteBedController({ deleteBed })
    ).scoped()
  });
};

export type containerDeps = {
  db: Db;
  client: MongoClient;
};

export const createAppContainer = (deps: containerDeps): AppContainer => {
  const container: AppContainer = createContainer({
    injectionMode: InjectionMode.PROXY
  });
  container.register({
    DBClient: asValue(deps.client),
    db: asValue(deps.db)
  });

  registerCoreDependencies(container);
  registerPersistenceMappers(container);
  registerInfrastructureDependencies(container, deps.db, deps.client);
  registerHealthController(container);
  registerHealthUseCase(container);
  registerAuthControllers(container);
  registerAuthUseCases(container);
  registerFamilyControllers(container);
  registerFamilyUseCases(container);
  registerPlantControllers(container);
  registerPlantUseCases(container);
  registerBedControllers(container);
  registerBedUseCases(container);

  return container;
};
