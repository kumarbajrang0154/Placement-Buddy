// Error handling utility for standardized error responses
export class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

export const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(isDevelopment && { details: err.stack })
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      expiredAt: err.expiredAt
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: isDevelopment ? messages : undefined
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already exists`,
      code: 'DUPLICATE_FIELD',
      field
    });
  }

  // Default error response
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
