import { toRegistrationName } from '../../../../src/apps/agroApi/wiring/componentRoles.js';

describe('toRegistrationName', () => {
  it.each([
    { className: 'CreateBed', expected: 'createBed' },
    { className: 'DoThing', expected: 'doThing' },
    { className: 'CreateBedController', expected: 'createBedController' },
    { className: 'PlantQueryMapper', expected: 'plantQueryMapper' },
    { className: 'MongoBedRepository', expected: 'bedRepository' },
    { className: 'MongoAuthRepository', expected: 'authRepository' },
    { className: 'EncrypterAdapter', expected: 'encrypter' },
    {
      className: 'GoogleIdTokenVerifierAdapter',
      expected: 'googleIdTokenVerifier'
    },
    { className: 'MongoEnvironmentArranger', expected: 'environmentArranger' }
  ])('converts $className to $expected', ({ className, expected }) => {
    const result = toRegistrationName(className);

    expect(result).toBe(expected);
  });
});
