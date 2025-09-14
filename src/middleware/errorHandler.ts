import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  // Handle specific error types
  if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service unavailable';
  } else if (error.message?.includes('JWT')) {
    statusCode = 401;
    message = 'Authentication failed';
  } else if (error.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // Comprehensive error logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
      },
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query,
      ip: req.ip
    }
  };

  console.error(`❌ Error ${statusCode}:`, errorLog);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
  }

  const errorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    }),
  };

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes for better error handling
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}