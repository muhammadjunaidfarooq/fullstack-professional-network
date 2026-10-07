/**
 * An error that carries an HTTP status code. Throw it from any controller or
 * middleware; the central error handler turns it into a JSON response.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = "Authentication required") =>
  new HttpError(401, message);
export const forbidden = (message = "You are not allowed to do this") =>
  new HttpError(403, message);
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
