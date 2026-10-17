import { LookupUser } from '../../../../../src/Contexts/Auth/application/useCases/LookupUser.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { AuthRepositoryMock } from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('LookupUser', () => {
  let repository: AuthRepositoryMock;
  let useCase: LookupUser;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    useCase = new LookupUser({ authRepository: repository });
  });

  it('resolves by email via search', async () => {
    const target = UserMother.create({ emailValidated: true });
    repository.setSearchResult(target);

    const result = await useCase.execute({ email: target.email.value });

    repository.assertSearchHasBeenCalledWith(target.email.value);
    expect(result.id).toBe(target.id);
  });

  it('resolves by username via searchByUsername', async () => {
    const target = UserMother.create({ emailValidated: true });
    repository.setSearchByUsernameResult(target);

    const result = await useCase.execute({
      username: target.username.value
    });

    repository.assertSearchByUsernameHasBeenCalledWith(target.username.value);
    expect(result.id).toBe(target.id);
  });

  it('refuses when no account matches with 404', async () => {
    repository.setSearchByUsernameResult(null);

    await expect(
      useCase.execute({ username: 'nobody' })
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });
});
