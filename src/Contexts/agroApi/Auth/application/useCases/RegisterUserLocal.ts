import { createError } from '../../../../../shared/errors/index.js';
import {
  Email,
  Metadata,
  PasswordHash,
  Uuid
} from '../../../../shared/domain/valueObject/index.js';
import {
  buildLogger,
  type EncrypterTool
} from '../../../../shared/plugins/index.js';
import {
  PlainPassword,
  User,
  UserAuthMethod,
  Username,
  UserRoles
} from '../../domain/index.js';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { RegisterUserRequest } from '../interfaces/index.js';

const logger = buildLogger('registerUser');
const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'Passwords do not match';

export class RegisterUserLocal {
  private readonly repository: UserRepository;
  private readonly encrypter: EncrypterTool;

  constructor(repository: UserRepository, encrypter: EncrypterTool) {
    this.repository = repository;
    this.encrypter = encrypter;
  }

  async run({
    password,
    repeatPassword,
    username,
    email,
    id
  }: RegisterUserRequest): Promise<void> {
    await this.ensureUserDoesNotExist(email);
    this.validatePasswordConfirmation(password, repeatPassword);

    const plainPassword = new PlainPassword(password);
    const encryptedPassword = this.encrypter.hash(plainPassword.value);
    const date = new Date();

    const user = new User({
      id: new Uuid(id),
      email: new Email(email),
      username: new Username(username),
      password: new PasswordHash(encryptedPassword),
      emailValidated: false,
      authMethods: [
        UserAuthMethod.local(new PasswordHash(encryptedPassword), date)
      ],
      roles: new UserRoles(['user']),
      metadata: Metadata.create(username)
    });

    await this.repository.save(user);
    logger.info(`User <${user.username.value}> registered`);
  }

  private async ensureUserDoesNotExist(email: string): Promise<void> {
    const storedUser = await this.repository.search(email);
    if (storedUser) {
      throw createError.badRequest(`User <${email}> already exists`);
    }
  }

  private validatePasswordConfirmation(
    password: string,
    repeatPassword?: string
  ): void {
    if (repeatPassword !== undefined && password !== repeatPassword) {
      throw createError.badRequest(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }
  }
}
