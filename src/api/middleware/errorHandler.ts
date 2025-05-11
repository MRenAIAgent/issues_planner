import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error('Error processing request', {
    path: req.path,
    method: req.method,
    statusCode,
    message,
    details: err.details,
    stack: err.stack
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    details: err.details
  });
} 