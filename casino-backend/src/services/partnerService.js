const Partner = require('../models/Partner');
const db = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class PartnerService {
  /**
   * Gera um código de indicação único (ex: BARZÉ2024, FROGx9K3)
   */
  static generateReferralCode(username) {
    const prefix = username.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const suffix = crypto.randomBytes(3).toString('hex').substring(0, 4).toUpperCase();
    return `${prefix}${suffix}`;
  }

  /**
   * Transforma um usuário existente em parceiro
   */
  static async createPartner(userId, { commissionType, commissionValue, commissionThreshold } = {}) {
    // Verificar se já é parceiro
    const existing = await Partner.findByUserId(userId);
    if (existing) {
      const error = new Error('Este usuário já é um parceiro');
      error.code = 'ALREADY_PARTNER';
      error.statusCode = 409;
      throw error;
    }

    // Verificar se o usuário existe
    const userResult = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      const error = new Error('Usuário não encontrado');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const username = userResult.rows[0].username;

    // Gerar código único
    let referralCode;
    let attempts = 0;
    do {
      referralCode = this.generateReferralCode(username);
      const exists = await Partner.findByReferralCode(referralCode);
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      referralCode = `P${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    const partner = await Partner.create({
      userId,
      referralCode,
      commissionType: commissionType || 'percentage',
      commissionValue: commissionValue || 5.00,
      commissionThreshold: commissionThreshold || 0,
    });

    logger.info('Novo parceiro criado', { partnerId: partner.id, userId, referralCode });
    return partner;
  }

  /**
   * Vincula um usuário a um parceiro pelo código de indicação.
   * Chamado durante o registro.
   */
  static async linkUserToPartner(userId, referralCode) {
    if (!referralCode) return null;

    const partner = await Partner.findByReferralCode(referralCode);
    if (!partner) {
      logger.warn('Código de indicação inválido usado no registro', { referralCode, userId });
      return null; // Não bloqueia o registro, apenas ignora código inválido
    }

    // Não permitir auto-referência
    if (partner.userId === userId) {
      logger.warn('Tentativa de auto-referência', { userId, referralCode });
      return null;
    }

    // Vincular o usuário ao parceiro
    await db.query('UPDATE users SET referred_by = $1 WHERE id = $2', [partner.id, userId]);

    // Incrementar contador
    await Partner.incrementReferredUsers(partner.id);

    logger.info('Usuário vinculado a parceiro', { 
      userId, partnerId: partner.id, referralCode 
    });

    return partner;
  }

  /**
   * Calcula e registra comissão baseada na perda do jogador em uma rodada.
   * Chamado após cada rodada de jogo quando o jogador perde.
   * 
   * @param {string} userId - ID do jogador que perdeu
   * @param {number} betAmount - valor apostado
   * @param {number} winAmount - valor ganho (pode ser 0)
   * @param {string} transactionId - ID da transação de aposta
   */
  static async processCommission(userId, betAmount, winAmount, transactionId) {
    try {
      // Perda líquida = apostado - ganho
      const lossAmount = betAmount - winAmount;
      if (lossAmount <= 0) return null; // Não houve perda, sem comissão

      // Verificar se o usuário tem parceiro vinculado
      const userResult = await db.query(
        'SELECT referred_by FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0] || !userResult.rows[0].referred_by) return null;

      const partnerId = userResult.rows[0].referred_by;

      // Buscar dados do parceiro
      const partnerResult = await db.query(
        'SELECT * FROM partners WHERE id = $1 AND is_active = true',
        [partnerId]
      );

      if (partnerResult.rows.length === 0) return null;

      const partner = partnerResult.rows[0];

      // Calcular comissão
      let commissionAmount = 0;

      if (partner.commission_type === 'percentage') {
        commissionAmount = lossAmount * (parseFloat(partner.commission_value) / 100);
      } else if (partner.commission_type === 'fixed') {
        // Valor fixo: só gera quando a perda atinge o threshold
        if (lossAmount >= parseFloat(partner.commission_threshold)) {
          commissionAmount = parseFloat(partner.commission_value);
        }
      }

      if (commissionAmount <= 0) return null;

      // Arredondar para 2 casas
      commissionAmount = Math.round(commissionAmount * 100) / 100;

      // Registrar comissão
      const commissionId = uuidv4();
      await db.query(
        `INSERT INTO partner_commissions 
         (id, partner_id, referred_user_id, transaction_id, bet_amount, loss_amount, commission_amount, commission_type, commission_value, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [commissionId, partnerId, userId, transactionId, betAmount, lossAmount, commissionAmount, 
         partner.commission_type, partner.commission_value]
      );

      // Atualizar saldo pendente do parceiro
      await Partner.addPendingCommission(partnerId, commissionAmount);

      logger.info('Comissão registrada', {
        partnerId, userId, lossAmount, commissionAmount, commissionId
      });

      return { commissionId, commissionAmount };
    } catch (error) {
      // Não falhar o jogo por erro de comissão
      logger.error('Erro ao processar comissão', { error: error.message, userId, betAmount });
      return null;
    }
  }

  /**
   * Solicita saque de comissões validadas
   */
  static async requestWithdrawal(partnerId, amount) {
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      const error = new Error('Parceiro não encontrado');
      error.code = 'PARTNER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error('Valor de saque inválido');
      error.code = 'INVALID_AMOUNT';
      error.statusCode = 400;
      throw error;
    }

    if (amount > partner.commissionBalance) {
      const error = new Error('Saldo de comissões insuficiente');
      error.code = 'INSUFFICIENT_COMMISSION_BALANCE';
      error.statusCode = 400;
      throw error;
    }

    // Verificar se já existe uma solicitação pendente
    const pendingResult = await db.query(
      `SELECT id FROM partner_withdrawals WHERE partner_id = $1 AND status = 'pending'`,
      [partnerId]
    );
    if (pendingResult.rows.length > 0) {
      const error = new Error('Já existe uma solicitação de saque pendente');
      error.code = 'PENDING_WITHDRAWAL_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    const withdrawalId = uuidv4();
    await db.query(
      `INSERT INTO partner_withdrawals (id, partner_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [withdrawalId, partnerId, amount]
    );

    // Reservar o valor (subtrair do saldo de comissões)
    await db.query(
      `UPDATE partners SET commission_balance = commission_balance - $1 WHERE id = $2`,
      [amount, partnerId]
    );

    logger.info('Solicitação de saque de comissão criada', { partnerId, amount, withdrawalId });

    return { withdrawalId, amount };
  }

  /**
   * Admin aprova/rejeita solicitação de saque
   */
  static async reviewWithdrawal(withdrawalId, adminId, { status, notes }) {
    const wdResult = await db.query(
      `SELECT * FROM partner_withdrawals WHERE id = $1 AND status = 'pending'`,
      [withdrawalId]
    );

    if (wdResult.rows.length === 0) {
      const error = new Error('Solicitação não encontrada ou já processada');
      error.code = 'WITHDRAWAL_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const withdrawal = wdResult.rows[0];

    if (status === 'approved') {
      // Transferir para carteira principal do parceiro
      await db.query(
        `UPDATE users SET balance = balance + $1 WHERE id = (SELECT user_id FROM partners WHERE id = $2)`,
        [withdrawal.amount, withdrawal.partner_id]
      );

      await db.query(
        `UPDATE partner_withdrawals 
         SET status = 'approved', reviewed_by = $1, review_notes = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [adminId, notes || null, withdrawalId]
      );

      logger.info('Saque de comissão aprovado', { withdrawalId, amount: withdrawal.amount, adminId });
    } else if (status === 'rejected') {
      // Devolver o valor ao saldo de comissões
      await db.query(
        `UPDATE partners SET commission_balance = commission_balance + $1 WHERE id = $2`,
        [withdrawal.amount, withdrawal.partner_id]
      );

      await db.query(
        `UPDATE partner_withdrawals 
         SET status = 'rejected', reviewed_by = $1, review_notes = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [adminId, notes || null, withdrawalId]
      );

      logger.info('Saque de comissão rejeitado', { withdrawalId, amount: withdrawal.amount, adminId });
    }

    return { withdrawalId, status, amount: parseFloat(withdrawal.amount) };
  }

  /**
   * Lista solicitações de saque (para admin)
   */
  static async getWithdrawals({ status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const values = [];
    let whereClause = '';

    if (status) {
      values.push(status);
      whereClause = `WHERE pw.status = $${values.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM partner_withdrawals pw ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const query = `
      SELECT pw.*, p.referral_code, u.username, u.email
      FROM partner_withdrawals pw
      JOIN partners p ON p.id = pw.partner_id
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY pw.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const result = await db.query(query, values);

    return {
      withdrawals: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Histórico de comissões de um parceiro
   */
  static async getCommissionHistory(partnerId, { page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit;
    const values = [partnerId];
    let statusFilter = '';

    if (status) {
      values.push(status);
      statusFilter = `AND pc.status = $${values.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM partner_commissions pc WHERE pc.partner_id = $1 ${statusFilter}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const query = `
      SELECT pc.*, u.username as referred_username
      FROM partner_commissions pc
      JOIN users u ON u.id = pc.referred_user_id
      WHERE pc.partner_id = $1 ${statusFilter}
      ORDER BY pc.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const result = await db.query(query, values);

    return {
      commissions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = PartnerService;
