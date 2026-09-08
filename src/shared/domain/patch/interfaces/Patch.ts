export interface Patch<T> {
  apply(target: T): T;
}
