import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { EmailTokenPrimitives } from '../../value-objects/types/EmailTokenPrimitives.js';
import type { UserAuthMethodPrimitives } from '../../value-objects/types/UserAuthMethodPrimitives.js';

export interface UserPrimitives {
  id: string;
  email: string;
  username: string;
  password?: string;
  emailValidated: boolean;
  authMethods: UserAuthMethodPrimitives[];
  // Absent, never `[]`, when the account holds no token.
  emailTokens?: EmailTokenPrimitives[];
  roles: string[];
  metadata: MetadataPrimitives;
  // Optimistic-concurrency counter. Absent on documents stored before this
  // field existed; read as 0. Never set from client input.
  version?: number;
}
