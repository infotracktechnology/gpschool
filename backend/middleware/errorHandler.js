export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'A record with duplicate unique value already exists.',
      detail: err.sqlMessage || err.message,
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      message: 'Cannot delete or update record because other records depend on it.',
      detail: err.sqlMessage || err.message,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
