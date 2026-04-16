const Partner = require('../models/Partner');
const PartnerService = require('../services/partnerService');
const logger = require('../utils/logger');
const db = require('../config/database');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class PartnerController {
  // ========================
  // ENDPOINTS DO ADMIN
  // ========================

  /**
   * POST /api/partners/admin/create
   * Transformar um usuário em parceiro
   */
  static async createPartner(req, res, next) {
    try {
      const { userId, commissionType, commissionValue, commissionThreshold } = req.body;

      if (!userId || !UUID_REGEX.test(userId)) {
        return res.status(400).json({ success: false, error: 'ID do usuário inválido', code: 'INVALID_USER_ID' });
      }

      const partner = await PartnerService.createPartner(userId, {
        commissionType, commissionValue, commissionThreshold,
      });

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, 'create_partner', 'partner', $2, $3, $4, $5)`,
        [req.user.id, partner.id, JSON.stringify({ userId, commissionType, commissionValue }), req.ip, req.get('user-agent')]
      );

      res.status(201).json({
        success: true,
        message: 'Parceiro criado com sucesso',
        data: { partner: partner.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/list
   * Listar todos os parceiros com busca e filtros
   */
  static async listPartners(req, res, next) {
    try {
      const { page = 1, limit = 20, active, search, status, commissionType, dateFrom, dateTo, sortBy, sortOrder } = req.query;
      
      // Se tem filtros avançados, usar search
      if (search || status || commissionType || dateFrom || dateTo || sortBy) {
        const result = await Partner.search({
          page: parseInt(page),
          limit: parseInt(limit),
          search,
          status: status || (active !== undefined ? (active === 'true' ? 'active' : 'blocked') : undefined),
          commissionType,
          dateFrom,
          dateTo,
          sortBy,
          sortOrder,
        });
        return res.json({ success: true, data: result });
      }

      const result = await Partner.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        active: active !== undefined ? active === 'true' : undefined,
      });

      res.json({
        success: true,
        data: {
          partners: result.partners.map(p => p.toJSON()),
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/:partnerId
   * Detalhes de um parceiro (admin)
   */
  static async getPartnerDetails(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Parceiro não encontrado', code: 'PARTNER_NOT_FOUND' });
      }

      const [stats, referredUsers] = await Promise.all([
        Partner.getStats(partnerId),
        Partner.getReferredUsers(partnerId),
      ]);

      res.json({
        success: true,
        data: { partner: partner.toJSON(), stats, referredUsers },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/partners/admin/:partnerId/config
   * Atualizar configuração de comissão
   */
  static async updatePartnerConfig(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const { commissionType, commissionValue, commissionThreshold, validationPeriodHours } = req.body;

      const updated = await Partner.updateConfig(partnerId, {
        commissionType, commissionValue, commissionThreshold, validationPeriodHours,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Parceiro não encontrado', code: 'PARTNER_NOT_FOUND' });
      }

      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, 'update_partner_config', 'partner', $2, $3, $4, $5)`,
        [req.user.id, partnerId, JSON.stringify(req.body), req.ip, req.get('user-agent')]
      );

      res.json({
        success: true,
        message: 'Configuração do parceiro atualizada',
        data: { partner: updated.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/partners/admin/:partnerId/toggle
   * Ativar/desativar parceiro
   */
  static async togglePartner(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, error: 'isActive deve ser booleano', code: 'INVALID_INPUT' });
      }

      const updated = await Partner.toggleActive(partnerId, isActive);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Parceiro não encontrado', code: 'PARTNER_NOT_FOUND' });
      }

      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, $2, 'partner', $3, $4, $5, $6)`,
        [req.user.id, isActive ? 'activate_partner' : 'deactivate_partner', partnerId,
         JSON.stringify({ isActive }), req.ip, req.get('user-agent')]
      );

      res.json({
        success: true,
        message: isActive ? 'Parceiro ativado' : 'Parceiro desativado',
        data: { partner: updated.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/withdrawals
   * Listar solicitações de saque
   */
  static async listWithdrawals(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = await PartnerService.getWithdrawals({
        status, page: parseInt(page), limit: parseInt(limit),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/partners/admin/withdrawals/:withdrawalId/review
   * Aprovar ou rejeitar saque
   */
  static async reviewWithdrawal(req, res, next) {
    try {
      const { withdrawalId } = req.params;
      if (!UUID_REGEX.test(withdrawalId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const { status, notes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Status deve ser approved ou rejected', code: 'INVALID_STATUS' });
      }

      const result = await PartnerService.reviewWithdrawal(withdrawalId, req.user.id, { status, notes });

      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, $2, 'partner_withdrawal', $3, $4, $5, $6)`,
        [req.user.id, `withdrawal_${status}`, withdrawalId,
         JSON.stringify({ amount: result.amount, notes }), req.ip, req.get('user-agent')]
      );

      res.json({
        success: true,
        message: status === 'approved' ? 'Saque aprovado com sucesso' : 'Saque rejeitado',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/partners/admin/validate-commissions
   * Trigger manual para validar comissões pendentes
   */
  static async validateCommissions(req, res, next) {
    try {
      const validated = await Partner.validatePendingCommissions();
      res.json({
        success: true,
        message: `${validated} comissões validadas`,
        data: { validatedCount: validated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/metrics
   * Métricas gerais do sistema de parceiros
   */
  static async getMetrics(req, res, next) {
    try {
      const metrics = await Partner.getAdminMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/ranking
   * Ranking de parceiros
   */
  static async getRanking(req, res, next) {
    try {
      const { page = 1, limit = 20, sortBy } = req.query;
      const result = await Partner.getRanking({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/pending-commissions
   * Comissões pendentes de todos os parceiros
   */
  static async getPendingCommissions(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await Partner.getPendingCommissions({
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/partners/admin/:partnerId/regenerate-code
   * Gerar novo código de indicação
   */
  static async regenerateCode(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const updated = await Partner.regenerateCode(partnerId);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Parceiro não encontrado', code: 'PARTNER_NOT_FOUND' });
      }

      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, 'regenerate_partner_code', 'partner', $2, $3, $4, $5)`,
        [req.user.id, partnerId, JSON.stringify({ newCode: updated.referralCode }), req.ip, req.get('user-agent')]
      );

      res.json({
        success: true,
        message: 'Código regenerado com sucesso',
        data: { partner: updated.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/partners/admin/:partnerId
   * Excluir parceiro
   */
  static async deletePartner(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Parceiro não encontrado', code: 'PARTNER_NOT_FOUND' });
      }

      await Partner.deletePartner(partnerId);

      await db.query(
        `INSERT INTO audit_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (gen_random_uuid(), $1, 'delete_partner', 'partner', $2, $3, $4, $5)`,
        [req.user.id, partnerId, JSON.stringify({ username: partner.username, referralCode: partner.referralCode }), req.ip, req.get('user-agent')]
      );

      res.json({ success: true, message: 'Parceiro excluído com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/:partnerId/commissions
   * Histórico de comissões de um parceiro específico (admin)
   */
  static async getPartnerCommissions(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await Partner.getCommissionHistory(partnerId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/:partnerId/referred-users
   * Usuários indicados de um parceiro específico (admin)
   */
  static async getPartnerReferredUsers(req, res, next) {
    try {
      const { partnerId } = req.params;
      if (!UUID_REGEX.test(partnerId)) {
        return res.status(400).json({ success: false, error: 'ID inválido', code: 'INVALID_ID' });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await Partner.getReferredUsers(partnerId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/admin/export
   * Exportar dados dos parceiros em CSV
   */
  static async exportPartners(req, res, next) {
    try {
      const result = await Partner.search({ page: 1, limit: 10000 });
      
      const headers = ['Parceiro', 'Email', 'Código', 'Tipo', 'Comissão', 'Indicados', 'Perdas Geradas', 'Comissão Total', 'Saldo Disponível', 'Saldo Pendente', 'Status', 'Criado em'];
      const rows = result.partners.map(p => [
        p.username || '',
        p.email || '',
        p.referralCode,
        p.commissionType === 'percentage' ? 'RevShare' : 'CPA',
        p.commissionType === 'percentage' ? `${p.commissionValue}%` : `R$ ${p.commissionValue}`,
        p.totalReferredUsers,
        p.totalLosses.toFixed(2),
        p.totalCommissionsEarned.toFixed(2),
        p.commissionBalance.toFixed(2),
        p.pendingCommission.toFixed(2),
        p.isActive ? 'Ativo' : 'Bloqueado',
        p.createdAt,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=parceiros.csv');
      res.send('\uFEFF' + csv); // BOM for UTF-8
    } catch (error) {
      next(error);
    }
  }

  // ========================
  // ENDPOINTS DO PARCEIRO
  // ========================

  /**
   * GET /api/partners/me
   * Dados do parceiro logado
   */
  static async getMyPartnerProfile(req, res, next) {
    try {
      const partner = await Partner.findByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Você não é um parceiro', code: 'NOT_A_PARTNER' });
      }

      const [stats, referredUsers] = await Promise.all([
        Partner.getStats(partner.id),
        Partner.getReferredUsers(partner.id, { page: 1, limit: 10 }),
      ]);

      res.json({
        success: true,
        data: { partner: partner.toJSON(), stats, referredUsers },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/me/referred-users
   * Usuários indicados pelo parceiro logado
   */
  static async getMyReferredUsers(req, res, next) {
    try {
      const partner = await Partner.findByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Você não é um parceiro', code: 'NOT_A_PARTNER' });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await Partner.getReferredUsers(partner.id, {
        page: parseInt(page), limit: parseInt(limit),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/me/commissions
   * Histórico de comissões do parceiro logado
   */
  static async getMyCommissions(req, res, next) {
    try {
      const partner = await Partner.findByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Você não é um parceiro', code: 'NOT_A_PARTNER' });
      }

      const { page = 1, limit = 20, status } = req.query;
      const result = await PartnerService.getCommissionHistory(partner.id, {
        page: parseInt(page), limit: parseInt(limit), status,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/partners/me/withdraw
   * Solicitar saque de comissões
   */
  static async requestWithdrawal(req, res, next) {
    try {
      const partner = await Partner.findByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Você não é um parceiro', code: 'NOT_A_PARTNER' });
      }

      const { amount } = req.body;
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valor inválido', code: 'INVALID_AMOUNT' });
      }

      const result = await PartnerService.requestWithdrawal(partner.id, parseFloat(amount));

      res.json({
        success: true,
        message: 'Solicitação de saque enviada. Aguarde aprovação do administrador.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/partners/me/withdrawals
   * Histórico de saques do parceiro logado
   */
  static async getMyWithdrawals(req, res, next) {
    try {
      const partner = await Partner.findByUserId(req.user.id);
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Você não é um parceiro', code: 'NOT_A_PARTNER' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const countResult = await db.query(
        'SELECT COUNT(*) FROM partner_withdrawals WHERE partner_id = $1',
        [partner.id]
      );
      const total = parseInt(countResult.rows[0].count);

      const result = await db.query(
        `SELECT * FROM partner_withdrawals 
         WHERE partner_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [partner.id, parseInt(limit), offset]
      );

      res.json({
        success: true,
        data: {
          withdrawals: result.rows,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ========================
  // ENDPOINT PÚBLICO
  // ========================

  /**
   * GET /api/partners/validate-code/:code
   * Validar código de indicação (usado no cadastro)
   */
  static async validateCode(req, res, next) {
    try {
      const { code } = req.params;
      if (!code || code.length < 3 || code.length > 20) {
        return res.status(400).json({ success: false, error: 'Código inválido', code: 'INVALID_CODE' });
      }

      const partner = await Partner.findByReferralCode(code.toUpperCase());
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Código de indicação não encontrado', code: 'CODE_NOT_FOUND' });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          partnerName: partner.username,
          referralCode: partner.referralCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartnerController;
