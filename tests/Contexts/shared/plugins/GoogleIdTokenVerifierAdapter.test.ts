import {
  LoginTicket,
  OAuth2Client,
  type TokenPayload
} from 'google-auth-library';

import { DomainServiceUnavailableException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { GoogleIdTokenVerifierAdapter } from '../../../../src/Contexts/shared/plugins/index.js';

const CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
const ID_TOKEN = 'header.payload.signature';
const CERTS = { 'key-id': 'public-key' };
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

type CertsResponse = Awaited<
  ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>
>;
const CERTS_RESPONSE = {
  certs: CERTS,
  format: 'PEM' as CertsResponse['format']
};

const ticketFor = (payload: Partial<TokenPayload>): LoginTicket =>
  new LoginTicket('envelope', {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    iat: 0,
    exp: 0,
    sub: '',
    ...payload
  });

describe('GoogleIdTokenVerifierAdapter', () => {
  let certsSpy: jest.SpiedFunction<
    OAuth2Client['getFederatedSignonCertsAsync']
  >;
  let verifySpy: jest.SpiedFunction<
    OAuth2Client['verifySignedJwtWithCertsAsync']
  >;
  let adapter: GoogleIdTokenVerifierAdapter;

  beforeEach(() => {
    certsSpy = jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockResolvedValue(CERTS_RESPONSE);
    verifySpy = jest
      .spyOn(OAuth2Client.prototype, 'verifySignedJwtWithCertsAsync')
      .mockResolvedValue(
        ticketFor({
          sub: 'google-sub',
          email: 'person@example.com',
          email_verified: true,
          name: 'A Person'
        })
      );
    adapter = new GoogleIdTokenVerifierAdapter({ googleClientId: CLIENT_ID });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should answer the payload of a token Google signed for the client id', async () => {
    const payload = await adapter.verifyIdToken(ID_TOKEN);

    expect(payload).toEqual({
      sub: 'google-sub',
      email: 'person@example.com',
      emailVerified: true,
      name: 'A Person'
    });
    expect(verifySpy).toHaveBeenCalledWith(
      ID_TOKEN,
      CERTS,
      CLIENT_ID,
      GOOGLE_ISSUERS
    );
  });

  it('should leave the name out when the token has none', async () => {
    verifySpy.mockResolvedValue(
      ticketFor({ sub: 'google-sub', email: 'person@example.com' })
    );

    const payload = await adapter.verifyIdToken(ID_TOKEN);

    expect(payload).toEqual({
      sub: 'google-sub',
      email: 'person@example.com',
      emailVerified: false
    });
  });

  it('should answer null when Google rejects the token', async () => {
    verifySpy.mockRejectedValue(new Error('Wrong recipient'));

    expect(await adapter.verifyIdToken(ID_TOKEN)).toBeNull();
  });

  it.each([
    ['sub', { email: 'person@example.com' }],
    ['email', { sub: 'google-sub' }]
  ])('should answer null when the payload has no %s', async (_field, data) => {
    verifySpy.mockResolvedValue(ticketFor(data));

    expect(await adapter.verifyIdToken(ID_TOKEN)).toBeNull();
  });

  it('should refuse a token shaped like the old test shortcut', async () => {
    verifySpy.mockRestore();

    expect(
      await adapter.verifyIdToken('test-google|sub|a%40b.c|true')
    ).toBeNull();
  });

  it('should be unavailable, without checking the token, when the keys cannot be fetched', async () => {
    certsSpy.mockRejectedValue(
      Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })
    );

    await expect(adapter.verifyIdToken(ID_TOKEN)).rejects.toThrow(
      DomainServiceUnavailableException
    );
    expect(verifySpy).not.toHaveBeenCalled();
  });
});
