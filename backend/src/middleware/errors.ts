import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: error.flatten() });
  }

  const status = Number(error?.status ?? 500);
  const message = status >= 500 ? 'Internal server error' : error.message;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: message });
}
