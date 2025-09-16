const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Erro capturado pelo middleware:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: err.details,
    });
  }

  // Erro de banco de dados PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Violação de constraint única
        return res.status(409).json({
          error: 'Dados já existem no sistema',
          code: 'DUPLICATE_ENTRY',
        });
      case '23503': // Violação de foreign key
        return res.status(400).json({
          error: 'Referência inválida',
          code: 'INVALID_REFERENCE',
        });
      case '23514': // Violação de check constraint
        return res.status(400).json({
          error: 'Dados não atendem aos critérios',
          code: 'CONSTRAINT_VIOLATION',
        });
    }
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Rota não encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};