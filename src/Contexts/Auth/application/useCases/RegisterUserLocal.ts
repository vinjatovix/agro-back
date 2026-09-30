import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../shared/domain/errors/index.js';
import { Email, Metadata } from '../../../shared/domain/valueObject/index.js';
import {
  buildLogger,
  type EncrypterTool
} from '../../../shared/plugins/index.js';
import { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import { createUserId } from '../../domain/UserId.js';
import {
  PasswordHash,
  PlainPassword,
  UserAuthMethod,
  Username,
  UserRoles
} from '../../domain/value-objects/index.js';
import type { RegisterUserRequest } from '../interfaces/index.js';
import { PASSWORDS_DO_NOT_MATCH_MESSAGE } from '../messages.js';

const logger = buildLogger('registerUser');

export class RegisterUserLocal {
  private readonly repository: AuthRepository;
  private readonly encrypter: EncrypterTool;

  constructor(repository: AuthRepository, encrypter: EncrypterTool) {
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
    // Password rule before any lookup: a weak password is always a 400.
    const plainPassword = new PlainPassword(password);
    this.validatePasswordConfirmation(password, repeatPassword);
    await this.ensureIdDoesNotExist(id);
    await this.ensureUserDoesNotExist(email);

    const encryptedPassword = this.encrypter.hash(plainPassword.value);
    const date = new Date();

    const user = new User({
      id: createUserId(id),
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
  private async ensureIdDoesNotExist(id: string): Promise<void> {
    const storedUser = await this.repository.findByQuery({ id });
    if (storedUser.length > 0) {
      throw new DomainConflictException(`User with id ${id} already exists`);
    }
  }

  private async ensureUserDoesNotExist(email: string): Promise<void> {
    const storedUser = await this.repository.search(email);
    if (storedUser) {
      throw new InvalidArgumentException(`User ${email} already exists`);
    }
  }

  private validatePasswordConfirmation(
    password: string,
    repeatPassword?: string
  ): void {
    if (repeatPassword !== undefined && password !== repeatPassword) {
      throw new InvalidArgumentException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }
  }
}
