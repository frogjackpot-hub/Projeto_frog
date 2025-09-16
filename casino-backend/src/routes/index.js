const express = require('express');
const router = express.Router();

// Importar rotas específicas
const authRoutes = require('./auth');
const gameRoutes = require('./games');
const walletRoutes = require('./wallet');

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API do Cassino Online funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Registrar rotas
router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/wallet', walletRoutes);

module.exports = router;