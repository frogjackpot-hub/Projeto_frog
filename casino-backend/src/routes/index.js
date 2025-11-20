const express = require('express');
const router = express.Router();

// Importar rotas específicas
const authRoutes = require('./auth');
const gameRoutes = require('./games');
const walletRoutes = require('./wallet');
const dashboardRoutes = require('./dashboard');
const adminRoutes = require('./admin');

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
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;