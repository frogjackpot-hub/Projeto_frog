const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/partnerController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ========================
// ROTAS PÚBLICAS
// ========================

/**
 * @route   GET /api/partners/validate-code/:code
 * @desc    Validar código de indicação (usado na tela de cadastro)
 * @access  Public
 */
router.get('/validate-code/:code', PartnerController.validateCode);

// ========================
// ROTAS DO PARCEIRO (autenticado)
// ========================

/**
 * @route   GET /api/partners/me
 * @desc    Painel do parceiro - perfil + stats
 * @access  Private (Partner)
 */
router.get('/me', authenticateToken, PartnerController.getMyPartnerProfile);

/**
 * @route   GET /api/partners/me/referred-users
 * @desc    Listar usuários indicados
 * @access  Private (Partner)
 */
router.get('/me/referred-users', authenticateToken, PartnerController.getMyReferredUsers);

/**
 * @route   GET /api/partners/me/commissions
 * @desc    Histórico de comissões
 * @access  Private (Partner)
 */
router.get('/me/commissions', authenticateToken, PartnerController.getMyCommissions);

/**
 * @route   POST /api/partners/me/withdraw
 * @desc    Solicitar saque de comissões
 * @access  Private (Partner)
 */
router.post('/me/withdraw', authenticateToken, PartnerController.requestWithdrawal);

/**
 * @route   GET /api/partners/me/withdrawals
 * @desc    Histórico de saques do parceiro
 * @access  Private (Partner)
 */
router.get('/me/withdrawals', authenticateToken, PartnerController.getMyWithdrawals);

// ========================
// ROTAS DO ADMIN
// ========================

/**
 * @route   POST /api/partners/admin/create
 * @desc    Transformar usuário em parceiro
 * @access  Private (Admin only)
 */
router.post('/admin/create', authenticateToken, requireAdmin, PartnerController.createPartner);

/**
 * @route   GET /api/partners/admin/list
 * @desc    Listar todos os parceiros
 * @access  Private (Admin only)
 */
router.get('/admin/list', authenticateToken, requireAdmin, PartnerController.listPartners);

/**
 * @route   GET /api/partners/admin/metrics
 * @desc    Métricas gerais do sistema de parceiros
 * @access  Private (Admin only)
 */
router.get('/admin/metrics', authenticateToken, requireAdmin, PartnerController.getMetrics);

/**
 * @route   GET /api/partners/admin/ranking
 * @desc    Ranking de parceiros
 * @access  Private (Admin only)
 */
router.get('/admin/ranking', authenticateToken, requireAdmin, PartnerController.getRanking);

/**
 * @route   GET /api/partners/admin/pending-commissions
 * @desc    Comissões pendentes de todos os parceiros
 * @access  Private (Admin only)
 */
router.get('/admin/pending-commissions', authenticateToken, requireAdmin, PartnerController.getPendingCommissions);

/**
 * @route   GET /api/partners/admin/export
 * @desc    Exportar dados dos parceiros em CSV
 * @access  Private (Admin only)
 */
router.get('/admin/export', authenticateToken, requireAdmin, PartnerController.exportPartners);

/**
 * @route   GET /api/partners/admin/withdrawals
 * @desc    Listar solicitações de saque
 * @access  Private (Admin only)
 */
router.get('/admin/withdrawals', authenticateToken, requireAdmin, PartnerController.listWithdrawals);

/**
 * @route   POST /api/partners/admin/validate-commissions
 * @desc    Validar comissões pendentes manualmente
 * @access  Private (Admin only)
 */
router.post('/admin/validate-commissions', authenticateToken, requireAdmin, PartnerController.validateCommissions);

/**
 * @route   GET /api/partners/admin/:partnerId
 * @desc    Detalhes de um parceiro
 * @access  Private (Admin only)
 */
router.get('/admin/:partnerId', authenticateToken, requireAdmin, PartnerController.getPartnerDetails);

/**
 * @route   PUT /api/partners/admin/:partnerId/config
 * @desc    Atualizar configuração de comissão do parceiro
 * @access  Private (Admin only)
 */
router.put('/admin/:partnerId/config', authenticateToken, requireAdmin, PartnerController.updatePartnerConfig);

/**
 * @route   PATCH /api/partners/admin/:partnerId/toggle
 * @desc    Ativar/desativar parceiro
 * @access  Private (Admin only)
 */
router.patch('/admin/:partnerId/toggle', authenticateToken, requireAdmin, PartnerController.togglePartner);

/**
 * @route   POST /api/partners/admin/:partnerId/regenerate-code
 * @desc    Gerar novo código de indicação
 * @access  Private (Admin only)
 */
router.post('/admin/:partnerId/regenerate-code', authenticateToken, requireAdmin, PartnerController.regenerateCode);

/**
 * @route   DELETE /api/partners/admin/:partnerId
 * @desc    Excluir parceiro
 * @access  Private (Admin only)
 */
router.delete('/admin/:partnerId', authenticateToken, requireAdmin, PartnerController.deletePartner);

/**
 * @route   GET /api/partners/admin/:partnerId/commissions
 * @desc    Histórico de comissões de um parceiro específico
 * @access  Private (Admin only)
 */
router.get('/admin/:partnerId/commissions', authenticateToken, requireAdmin, PartnerController.getPartnerCommissions);

/**
 * @route   GET /api/partners/admin/:partnerId/referred-users
 * @desc    Usuários indicados de um parceiro específico
 * @access  Private (Admin only)
 */
router.get('/admin/:partnerId/referred-users', authenticateToken, requireAdmin, PartnerController.getPartnerReferredUsers);

/**
 * @route   POST /api/partners/admin/withdrawals/:withdrawalId/review
 * @desc    Aprovar/rejeitar solicitação de saque
 * @access  Private (Admin only)
 */
router.post('/admin/withdrawals/:withdrawalId/review', authenticateToken, requireAdmin, PartnerController.reviewWithdrawal);

module.exports = router;
