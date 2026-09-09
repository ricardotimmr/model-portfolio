export class StudioExpectedError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'StudioExpectedError';
  }
}

export class StudioConflictError extends StudioExpectedError {
  constructor() {
    super(
      'This shooting changed in another tab. Reload before saving your changes.',
    );
    this.name = 'StudioConflictError';
  }
}
