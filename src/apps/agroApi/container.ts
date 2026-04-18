import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer
} from 'awilix';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CheckHealth } from '../../Contexts/agroApi/health/application/index.js';
import {
  GoogleIdTokenVerifierAdapter,
  buildLogger,
  type AppLogger
} from '../../Contexts/shared/plugins/index.js';
import {
  DBClientFactory,
  DBConfigFactory,
  DBEnvironmentArranger,
  type DBConfig
} from '../../shared/infrastructure/persistence/index.js';
import { CryptAdapter } from '../../Contexts/shared/plugins/CryptAdapter.js';
import { MongoAuthRepository } from '../../Contexts/agroApi/Auth/infrastructure/persistence/index.js';
import {
  AuthenticateWithGoogle,
  LoginUserLocal,
  RefreshToken,
  RegisterUserLocal,
  UpdatePasswordLocal,
  ValidateMail
} from '../../Contexts/agroApi/Auth/application/index.js';

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

export type AppContainer = AwilixContainer;

const registerCoreDependencies = (container: AppContainer): void => {
  container.register({
    appVersion: asValue(pkg.version),
    logger: asValue<AppLogger>(buildLogger('agroApi')),
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
    authRepository: asClass(MongoAuthRepository).singleton()
  });
};

const registerAuthUseCases = (container: AppContainer): void => {
  container.register({
    registerUser: asFunction((authRepository, encrypter) =>
      new RegisterUserLocal(authRepository, encrypter)
    ).scoped(),
    loginUser: asFunction((authRepository, encrypter) =>
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
    validateMail: asFunction((authRepository, encrypter) =>
      new ValidateMail(authRepository, encrypter)
    ).scoped(),
    refreshToken: asFunction((encrypter) => new RefreshToken(encrypter)).scoped(),
    updatePassword: asFunction((authRepository, encrypter) =>
      new UpdatePasswordLocal(authRepository, encrypter)
    ).scoped()
  });
};

export const createAppContainer = (): AppContainer => {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
  });

  registerCoreDependencies(container);
  registerInfrastructureDependencies(container);
  registerAuthUseCases(container);

  return container;
};
