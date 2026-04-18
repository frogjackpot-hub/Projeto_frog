const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const Partner = require('./models/Partner');
const fs = require('fs');
const path = require('path');

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Iniciar servidor
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Servidor rodando na porta ${config.port}`, {
    port: config.port,
    environment: config.nodeEnv,
  });
});

// Job simples para validar comissoes pendentes periodicamente
const commissionValidationJob = setInterval(async () => {
  try {
    const validated = await Partner.validatePendingCommissions();
    if (validated > 0) {
      logger.info('Comissoes validadas automaticamente', { validated });
    }
  } catch (error) {
    logger.error('Falha na validacao automatica de comissoes', { error: error.message });
  }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor graciosamente');
  clearInterval(commissionValidationJob);
  server.close(() => {
    logger.info('Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor graciosamente');
  clearInterval(commissionValidationJob);
  server.close(() => {
    logger.info('Servidor encerrado');
    process.exit(0);
  });
});

module.exports = server;