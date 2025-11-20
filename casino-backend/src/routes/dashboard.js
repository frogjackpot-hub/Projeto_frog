const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas de dashboard requerem autenticação
router.use(authenticateToken);

// Obter estatísticas do usuário
router.get('/stats', DashboardController.getUserStats);

module.exports = router;
