import { HttpErrorResponse } from '@angular/common/http';

/** Flattens the backend ApiError shape into a single readable message. */
export function readError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body?.fieldErrors && Object.keys(body.fieldErrors).length) {
      return Object.entries(body.fieldErrors)
        .map(([field, msg]) => field + ': ' + msg)
        .join(' | ');
    }
    if (body?.message) { return body.message; }
    if (err.status === 0) { return 'Cannot reach the server. Is the backend running on port 8080?'; }
    return err.statusText || 'Unexpected error';
  }
  return 'Unexpected error';
}
