import type { Nullable } from '../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../shared/domain/types/UnknownRecord.js';

export interface EncrypterTool {
  hash(value: string): string;
  compare(value: string, encryptedValue: string): boolean;
  /**
   * Costs as much as `compare` and matches nothing: for paths without a stored
   * hash, so they take as long as a wrong password.
   */
  simulateCompare(value: string): void;
  generateToken(payload: UnknownRecord): Promise<Nullable<string>>;
  verifyToken(token: string): Promise<Nullable<UnknownRecord>>;
  refreshToken(token: string): Promise<Nullable<string>>;
}
