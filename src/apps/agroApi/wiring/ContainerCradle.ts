import type { AwilixContainer } from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import type {
  CreateBed,
  DeleteBed,
  GetBedById,
  ListUserBeds,
  UpdateBed
} from '../../../Contexts/Agro/Beds/application/useCases/index.js';
import type { MongoBedRepository } from '../../../Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';
import type { BedPersistenceMapper } from '../../../Contexts/Agro/Beds/mappers/interfaces/BedPersistenceMapper.js';
import type { FamilyReadRepository } from '../../../Contexts/Agro/Families/application/queries/index.js';
import type {
  CreateFamily,
  GetFamilyById,
  GetFamilyBySlug,
  ListFamilies,
  UpdateFamily
} from '../../../Contexts/Agro/Families/application/useCases/index.js';
import type { MongoFamilyRepository } from '../../../Contexts/Agro/Families/infrastructure/persistence/MongoFamilyRepository.js';
import type { FamilyPersistenceMapper } from '../../../Contexts/Agro/Families/mappers/interfaces/FamilyPersistenceMapper.js';
import type {
  GetPlantInstanceById,
  ListPlantInstances,
  PlacePlantInstance,
  RemovePlantInstance,
  UpdatePlantInstance
} from '../../../Contexts/Agro/PlantInstances/application/useCases/index.js';
import type { CropSpatialService } from '../../../Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { MongoPlantInstanceRepository } from '../../../Contexts/Agro/PlantInstances/infrastructure/persistence/MongoPlantInstanceRepository.js';
import type { PlantInstancePersistenceMapper } from '../../../Contexts/Agro/PlantInstances/mappers/interfaces/PlantInstancePersistenceMapper.js';
import type {
  FamilySummaryReader,
  PlantReadRepository
} from '../../../Contexts/Agro/Plants/application/queries/index.js';
import type {
  CreatePlant,
  DeletePlant,
  GetPlant,
  ListPlants,
  UpdatePlant
} from '../../../Contexts/Agro/Plants/application/useCases/index.js';
import type { PlantQueryMapper } from '../../../Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';
import type { MongoPlantRepository } from '../../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import type { PlantPersistenceMapper } from '../../../Contexts/Agro/Plants/mappers/interfaces/PlantPersistenceMapper.js';
import type { AccountNotifier } from '../../../Contexts/Auth/application/notifications/index.js';
import type {
  ActivateAccount,
  AuthenticateWithGoogle,
  LoginUserLocal,
  RefreshToken,
  RegisterUserLocal,
  UpdatePasswordLocal
} from '../../../Contexts/Auth/application/useCases/index.js';
import type { MongoAuthRepository } from '../../../Contexts/Auth/infrastructure/persistence/MongoAuthRepository.js';
import type { CheckHealth } from '../../../Contexts/health/application/useCases/CheckHealth.js';
import type { BackgroundTasks } from '../../../Contexts/shared/application/background/index.js';
import type { UnitOfWork } from '../../../Contexts/shared/application/interfaces/index.js';
import type { Mailer } from '../../../Contexts/shared/application/mailer/index.js';
import type {
  AppLogger,
  EncrypterTool,
  GoogleIdTokenVerifierAdapter,
  OneTimeTokenTool
} from '../../../Contexts/shared/plugins/index.js';
import type { DBEnvironmentArranger } from '../../../shared/infrastructure/persistence/index.js';
import type {
  ActivateAccountController,
  AuthenticateWithGoogleController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  UpdatePasswordLocalController
} from '../controllers/Auth/index.js';
import type {
  CreateBedController,
  DeleteBedController,
  GetBedByIdController,
  GetUserBedsController,
  UpdateBedController
} from '../controllers/Beds/index.js';
import type {
  CreateFamilyController,
  GetAllFamiliesController,
  GetFamilyBySlugController,
  UpdateFamilyController
} from '../controllers/Families/index.js';
import type { HealthController } from '../controllers/health/HealthController.js';
import type {
  GetPlantInstanceByIdController,
  ListPlantInstancesController,
  PlacePlantInstanceController,
  RemovePlantInstanceController,
  UpdatePlantInstanceController
} from '../controllers/PlantInstances/index.js';
import type {
  CreatePlantController,
  DeletePlantController,
  GetAllPlantsController,
  GetPlantByIdController,
  UpdatePlantController
} from '../controllers/Plants/index.js';

export type ContainerCradle = {
  // Explicit values
  db: Db;
  DBClient: MongoClient;
  appVersion: string;
  logger: AppLogger;
  bedPersistenceMapper: BedPersistenceMapper;
  familyPersistenceMapper: FamilyPersistenceMapper;
  plantPersistenceMapper: PlantPersistenceMapper;
  plantInstancePersistenceMapper: PlantInstancePersistenceMapper;
  cropSpatialService: CropSpatialService;
  unitOfWork: UnitOfWork;
  familySummaryReader: FamilySummaryReader;
  mailer: Mailer;
  backgroundTasks: BackgroundTasks;
  accountNotifier: AccountNotifier;
  emailValidationRequired: boolean;
  activationLinkBaseUrl: string;

  // Singletons
  environmentArranger: DBEnvironmentArranger;
  encrypter: EncrypterTool;
  googleIdTokenVerifier: GoogleIdTokenVerifierAdapter;
  oneTimeToken: OneTimeTokenTool;
  authRepository: MongoAuthRepository;
  familyRepository: MongoFamilyRepository;
  familyReadRepository: FamilyReadRepository;
  plantRepository: MongoPlantRepository;
  plantReadRepository: PlantReadRepository;
  bedRepository: MongoBedRepository;
  plantInstanceRepository: MongoPlantInstanceRepository;
  plantQueryMapper: PlantQueryMapper;

  // Scoped use cases
  checkHealth: CheckHealth;
  registerUserLocal: RegisterUserLocal;
  loginUserLocal: LoginUserLocal;
  authenticateWithGoogle: AuthenticateWithGoogle;
  activateAccount: ActivateAccount;
  refreshToken: RefreshToken;
  updatePasswordLocal: UpdatePasswordLocal;
  createFamily: CreateFamily;
  getFamilyById: GetFamilyById;
  getFamilyBySlug: GetFamilyBySlug;
  listFamilies: ListFamilies;
  updateFamily: UpdateFamily;
  createPlant: CreatePlant;
  getPlant: GetPlant;
  listPlants: ListPlants;
  updatePlant: UpdatePlant;
  deletePlant: DeletePlant;
  createBed: CreateBed;
  listUserBeds: ListUserBeds;
  getBedById: GetBedById;
  updateBed: UpdateBed;
  deleteBed: DeleteBed;
  placePlantInstance: PlacePlantInstance;
  getPlantInstanceById: GetPlantInstanceById;
  listPlantInstances: ListPlantInstances;
  updatePlantInstance: UpdatePlantInstance;
  removePlantInstance: RemovePlantInstance;

  // Scoped controllers
  healthController: HealthController;
  registerUserLocalController: RegisterUserLocalController;
  loginUserLocalController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  activateAccountController: ActivateAccountController;
  refreshTokenController: RefreshTokenController;
  updatePasswordLocalController: UpdatePasswordLocalController;
  createFamilyController: CreateFamilyController;
  getAllFamiliesController: GetAllFamiliesController;
  getFamilyBySlugController: GetFamilyBySlugController;
  updateFamilyController: UpdateFamilyController;
  createPlantController: CreatePlantController;
  getAllPlantsController: GetAllPlantsController;
  getPlantByIdController: GetPlantByIdController;
  updatePlantController: UpdatePlantController;
  deletePlantController: DeletePlantController;
  createBedController: CreateBedController;
  getUserBedsController: GetUserBedsController;
  getBedByIdController: GetBedByIdController;
  updateBedController: UpdateBedController;
  deleteBedController: DeleteBedController;
  placePlantInstanceController: PlacePlantInstanceController;
  getPlantInstanceByIdController: GetPlantInstanceByIdController;
  listPlantInstancesController: ListPlantInstancesController;
  updatePlantInstanceController: UpdatePlantInstanceController;
  removePlantInstanceController: RemovePlantInstanceController;
};

export type AppContainer = AwilixContainer<ContainerCradle>;
