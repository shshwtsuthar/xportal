export class ApiError extends Error {
  constructor(public override message: string, public status: number = 500) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403);
  }
}

// UPGRADED: This class now carries a structured 'details' payload.
export class ValidationError extends ApiError {
  public readonly details?: Record<string, string[] | undefined>;

  constructor(
    message = 'The provided data is invalid or incomplete.',
    details?: Record<string, string[] | undefined>,
  ) {
    super(message, 400);
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request.') {
    super(message, 400);
  }
}