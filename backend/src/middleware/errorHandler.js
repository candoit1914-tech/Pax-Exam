export const errorHandler = (err, req, res, _next) => {
  const start = req._startTime || Date.now();
  const responseTime = Date.now() - start;

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    code: err.code || null,
    status: err.status || 500,
    responseTime,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors || err.message,
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'Request failed',
      field: err.field || undefined,
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'This record already exists',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  if (err.code === '23503') {
    const detail = err.detail || '';
    const fieldMatch = detail.match(/\((\w+)\)/);
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint failed',
      field: fieldMatch ? fieldMatch[1] : 'unknown',
      message: `Referenced record not found: ${detail}`,
    });
  }

  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data format',
      message: `Invalid input: ${err.message}`,
    });
  }

  if (err.code === '23502') {
    const detail = err.detail || '';
    const fieldMatch = detail.match(/column "(\w+)"/);
    return res.status(400).json({
      success: false,
      error: 'Missing required field',
      field: fieldMatch ? fieldMatch[1] : 'unknown',
      message: `Required field is missing or null: ${detail}`,
    });
  }

  if (err.code === '42P10') {
    return res.status(400).json({
      success: false,
      error: 'Cannot modify generated column',
      message: 'This column is automatically computed and cannot be set directly',
    });
  }

  if (err.code === '22001') {
    return res.status(400).json({
      success: false,
      error: 'Value too long',
      message: 'Input value exceeds maximum allowed length',
    });
  }

  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Check constraint violation',
      message: `Value does not meet the required constraint: ${err.message}`,
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === '57P01' || err.code === '57P02' || err.code === '57P03') {
    return res.status(503).json({
      success: false,
      error: 'Database unavailable',
      message: 'The database is currently unreachable. Please try again later.',
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : (err.message || 'Internal server error'),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Route ${req.originalUrl} not found`,
  });
};
