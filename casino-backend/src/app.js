const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeAll } = require('./middleware/sanitize');
const logger = require('./utils/logger');

const app = express();

// Trust proxy - necessário para Render.com e rate limiting
app.set('trust proxy', 1);

// Middleware de segurança com configurações avançadas
app.use(helmet({
  // Content Security Policy - Previne XSS e injeção de conteúdo
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", 
        process.env.FRONTEND_URL || "https://projeto-frog.onrender.com",
        "https://casino-backend-5y4k.onrender.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // X-Frame-Options - Previne Clickjacking
  frameguard: {
    action: 'deny'
  },
  // X-Content-Type-Options - Previne MIME sniffing
  noSniff: true,
  // X-XSS-Protection - Proteção adicional contra XSS
  xssFilter: true,
  // Referrer-Policy - Controla informações do referrer
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  // HSTS - Força HTTPS
  hsts: {
    maxAge: 31536000, // 1 ano em segundos
    includeSubDomains: true,
    preload: true
  },
  // Previne que o IE execute downloads no contexto do site
  ieNoOpen: true,
  // Remove header X-Powered-By
  hidePoweredBy: true,
  // Configuração de DNS Prefetch
  dnsPrefetchControl: {
    allow: false
  }
}));

// CORS - Configurar antes de outras rotas
app.use(cors(config.cors));

// Tratar requisições OPTIONS explicitamente
app.options('*', cors(config.cors));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitização de dados de entrada - Previne XSS armazenado
app.use(sanitizeAll);

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