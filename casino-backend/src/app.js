const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Middleware de segurança
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info('Requisição recebida', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Normalizar URL: remover caracteres de controle como CR/LF no início/fim
app.use((req, res, next) => {
  const original = req.url;
  // Remove apenas caracteres de quebra de linha e retorno de carro no começo/fim
  const cleaned = original.replace(/^[\r\n]+|[\r\n]+$/g, '');
  if (cleaned !== original) {
    logger.warn('URL normalizada (removidos caracteres de controle)', { original, cleaned, ip: req.ip });
    // Atualiza req.url para o roteamento correto
    req.url = cleaned;
    // Note: req.originalUrl é uma propriedade definida pelo Express e não deve ser escrito diretamente
  }
  next();
});

// Rotas principais
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bem-vindo ao Backend do Cassino Online!',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Middleware para rotas não encontradas
app.use(notFound);

// Middleware de tratamento de erros
app.use(errorHandler);

module.exports = app;