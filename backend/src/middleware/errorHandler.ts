import express from 'express';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('API Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
}
