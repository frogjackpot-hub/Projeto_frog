require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: require('./jwt'),
  cors: {
    // Em produção e desenvolvimento
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : process.env.NODE_ENV === 'production'
        ? [
            process.env.FRONTEND_URL,
            'https://casino-frontend-6g0m.onrender.com',
            'https://projeto-frog.onrender.com'
          ].filter(Boolean)
        : ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  },
};