export class ContainerWiringError extends Error {
  public override readonly name = 'ContainerWiringError';
  public readonly file?: string | undefined;
  public readonly className?: string | undefined;
  public readonly registrationName?: string | undefined;
  public readonly secondFile?: string | undefined;

  private constructor(
    message: string,
    options?: {
      file?: string;
      className?: string;
      registrationName?: string;
      secondFile?: string;
    }
  ) {
    super(message);
    this.file = options?.file;
    this.className = options?.className;
    this.registrationName = options?.registrationName;
    this.secondFile = options?.secondFile;
  }

  static unrecognizedClass(
    file: string,
    className: string
  ): ContainerWiringError {
    return new ContainerWiringError(
      `Unrecognized class '${className}' in '${file}'. It does not match the role conventions for its location.`,
      { file, className }
    );
  }

  static classNameMismatch(
    file: string,
    className: string
  ): ContainerWiringError {
    return new ContainerWiringError(
      `Class '${className}' in '${file}' does not match its file name. Each scanned file must export only the component named after it.`,
      { file, className }
    );
  }

  static duplicateName(
    name: string,
    firstFile: string,
    secondFile: string
  ): ContainerWiringError {
    return new ContainerWiringError(
      `Duplicate registration name '${name}' found in '${firstFile}' and '${secondFile}'.`,
      { registrationName: name, file: firstFile, secondFile }
    );
  }
}
