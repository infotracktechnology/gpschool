export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  const isProd = process.env.NODE_ENV === 'production';

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'A record with duplicate unique value already exists.',
      ...(!isProd && { detail: err.sqlMessage || err.message }),
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      message: 'Cannot delete or update record because other records depend on it.',
      ...(!isProd && { detail: err.sqlMessage || err.message }),
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: isProd ? 'Internal Server Error' : err.message || 'Internal Server Error',
    ...(!isProd && { detail: err.sqlMessage || err.message, stack: err.stack }),
  });
};
