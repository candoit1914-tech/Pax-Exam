export const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, process.env.NODE_ENV === 'development' ? err.stack : '');

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors || err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry. This record already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : (err.message || 'Internal server error')
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};
