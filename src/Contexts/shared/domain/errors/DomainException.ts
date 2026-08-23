export abstract class DomainException extends Error {
  public readonly errors?: Record<string, string>;

  constructor(message: string, errors?: Record<string, string>) {
    super(message);
    this.name = new.target.name;

    if (errors !== undefined) {
      this.errors = errors;
    }

    Error.captureStackTrace?.(this, new.target);
  }
}

export type DomainExceptionConstructor = new (
  message?: string,
  errors?: Record<string, string>
) => DomainException;
