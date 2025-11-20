const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { validateParamUUID } = require('../middleware/validateParams');
const Joi = require('joi');

// Schemas de validação
// Schema de validação para login admin
const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * @route   POST /api/admin/login
 * @desc    Login de administrador
 * @access  Public
 */
router.post('/login', validate(adminLoginSchema), AdminController.login);

/**
 * @route   POST /api/admin/logout
 * @desc    Logout de administrador
 * @access  Private (Admin only)
 */
router.post('/logout', authenticateToken, requireAdmin, AdminController.logout);

/**
 * @route   GET /api/admin/profile
 * @desc    Obter perfil do administrador
 * @access  Private (Admin only)
 */
router.get('/profile', authenticateToken, requireAdmin, AdminController.getProfile);

/**
 * @route   GET /api/admin/users
 * @desc    Listar todos os usuários
 * @access  Private (Admin only)
 */
router.get('/users', authenticateToken, requireAdmin, AdminController.getAllUsers);

/**
 * @route   GET /api/admin/stats
 * @desc    Obter estatísticas do sistema
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateToken, requireAdmin, AdminController.getStats);

// ========== ROTAS DE GESTÃO DE USUÁRIOS ==========

/**
 * @route   GET /api/admin/users/:id
 * @desc    Obter detalhes de um usuário
 * @access  Private (Admin only)
 */
router.get('/users/:id', authenticateToken, requireAdmin, validateParamUUID('id'), AdminController.getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Atualizar usuário
 * @access  Private (Admin only)
 */
const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  username: Joi.string().min(3).max(50),
  firstName: Joi.string().max(100),
  lastName: Joi.string().max(100),
  isActive: Joi.boolean()
});

router.put('/users/:id', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(updateUserSchema), 
  AdminController.updateUser
);

/**
 * @route   POST /api/admin/users/:id/add-balance
 * @desc    Adicionar saldo ao usuário
 * @access  Private (Admin only)
 */
const balanceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500)
});

router.post('/users/:id/add-balance', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(balanceSchema), 
  AdminController.addBalance
);

/**
 * @route   POST /api/admin/users/:id/remove-balance
 * @desc    Remover saldo do usuário
 * @access  Private (Admin only)
 */
router.post('/users/:id/remove-balance', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(balanceSchema), 
  AdminController.removeBalance
);

/**
 * @route   PATCH /api/admin/users/:id/toggle-status
 * @desc    Bloquear/Desbloquear usuário
 * @access  Private (Admin only)
 */
router.patch('/users/:id/toggle-status', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  AdminController.toggleUserStatus
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Deletar usuário
 * @access  Private (Admin only)
 */
router.delete('/users/:id', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  AdminController.deleteUser
);

// ========== ROTAS DE GESTÃO DE JOGOS ==========

/**
 * @route   GET /api/admin/games/stats
 * @desc    Obter estatísticas de jogos
 * @access  Private (Admin only)
 */
router.get('/games/stats', authenticateToken, requireAdmin, AdminController.getGameStats);

/**
 * @route   PUT /api/admin/games/:id
 * @desc    Atualizar configurações do jogo
 * @access  Private (Admin only)
 */
const updateGameSchema = Joi.object({
  name: Joi.string().max(100),
  minBet: Joi.number().positive(),
  maxBet: Joi.number().positive(),
  rtp: Joi.number().min(0).max(100),
  isActive: Joi.boolean()
});

router.put('/games/:id', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(updateGameSchema), 
  AdminController.updateGame
);

// ========== ROTAS DE GESTÃO DE TRANSAÇÕES ==========

/**
 * @route   GET /api/admin/transactions
 * @desc    Listar todas as transações com filtros
 * @access  Private (Admin only)
 */
router.get('/transactions', authenticateToken, requireAdmin, AdminController.getAllTransactions);

/**
 * @route   PATCH /api/admin/transactions/:id/status
 * @desc    Aprovar/Rejeitar transação
 * @access  Private (Admin only)
 */
const transactionStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required()
});

router.patch('/transactions/:id/status', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(transactionStatusSchema), 
  AdminController.updateTransactionStatus
);

// ========== ROTAS DE CONFIGURAÇÕES ==========

/**
 * @route   GET /api/admin/config
 * @desc    Obter configurações do cassino
 * @access  Private (Admin only)
 */
router.get('/config', authenticateToken, requireAdmin, AdminController.getConfig);

/**
 * @route   PUT /api/admin/config
 * @desc    Atualizar configurações do cassino
 * @access  Private (Admin only)
 */
const configSchema = Joi.object({
  configs: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.any().required(),
      description: Joi.string()
    })
  ).required()
});

router.put('/config', 
  authenticateToken, 
  requireAdmin, 
  validate(configSchema), 
  AdminController.updateConfig
);

// ========== ROTAS DE BÔNUS ==========

/**
 * @route   GET /api/admin/bonuses
 * @desc    Listar bônus
 * @access  Private (Admin only)
 */
router.get('/bonuses', authenticateToken, requireAdmin, AdminController.getBonuses);

/**
 * @route   POST /api/admin/bonuses
 * @desc    Criar bônus
 * @access  Private (Admin only)
 */
const createBonusSchema = Joi.object({
  code: Joi.string().required(),
  type: Joi.string().valid('deposit', 'no_deposit', 'cashback', 'free_spins').required(),
  value: Joi.number().positive().required(),
  minDeposit: Joi.number().min(0),
  maxBonus: Joi.number().positive(),
  wagerRequirement: Joi.number().min(1),
  expiresAt: Joi.date(),
  maxUses: Joi.number().integer().min(1),
  isActive: Joi.boolean(),
  description: Joi.string()
});

router.post('/bonuses', 
  authenticateToken, 
  requireAdmin, 
  validate(createBonusSchema), 
  AdminController.createBonus
);

/**
 * @route   PUT /api/admin/bonuses/:id
 * @desc    Atualizar bônus
 * @access  Private (Admin only)
 */
const updateBonusSchema = Joi.object({
  code: Joi.string(),
  type: Joi.string().valid('deposit', 'no_deposit', 'cashback', 'free_spins'),
  value: Joi.number().positive(),
  minDeposit: Joi.number().min(0),
  maxBonus: Joi.number().positive(),
  wagerRequirement: Joi.number().min(1),
  expiresAt: Joi.date(),
  maxUses: Joi.number().integer().min(1),
  isActive: Joi.boolean(),
  description: Joi.string()
});

router.put('/bonuses/:id', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  validate(updateBonusSchema), 
  AdminController.updateBonus
);

/**
 * @route   DELETE /api/admin/bonuses/:id
 * @desc    Deletar bônus
 * @access  Private (Admin only)
 */
router.delete('/bonuses/:id', 
  authenticateToken, 
  requireAdmin, 
  validateParamUUID('id'),
  AdminController.deleteBonus
);

// ========== ROTAS DE AUDITORIA ==========

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Obter logs de auditoria
 * @access  Private (Admin only)
 */
router.get('/audit-logs', authenticateToken, requireAdmin, AdminController.getAuditLogs);

module.exports = router;
