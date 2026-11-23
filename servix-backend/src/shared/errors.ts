/**
 * Errores de aplicación. Las capas internas (servicios) lanzan estos errores
 * sin saber nada de Express; el middleware de errores los traduce a HTTP.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(code: string, message: string) {
    super(401, code, message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, "FORBIDDEN", message);
  }
}
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}
export class ValidationError extends AppError {
  constructor(message: string, details: Record<string, string>) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}
