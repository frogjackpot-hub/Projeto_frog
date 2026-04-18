const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const LEVEL_PERCENTAGES = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 5,
  diamond: 7,
};

class Partner {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.referralCode = data.referral_code;
    this.commissionType = data.commission_type;
    this.commissionValue = parseFloat(data.commission_value);
    this.commissionThreshold = parseFloat(data.commission_threshold || 0);
    this.isActive = data.is_active;
    this.totalReferredUsers = data.total_referred_users || 0;
    this.totalCommissionsEarned = parseFloat(data.total_commissions_earned || 0);
    this.commissionBalance = parseFloat(data.commission_balance || 0);
    this.pendingCommission = parseFloat(data.pending_commission || 0);
    this.validationPeriodHours = data.validation_period_hours || 24;
    this.partnerLevel = data.partner_level || 'bronze';
    this.levelMode = data.level_mode || 'auto';
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    // Campos join (opcionais)
    this.username = data.username;
    this.email = data.email;
  }

  static async create({ userId, referralCode, commissionType, commissionValue, commissionThreshold }) {
    const id = uuidv4();
    const query = `
      INSERT INTO partners (id, user_id, referral_code, commission_type, commission_value, commission_threshold, partner_level, level_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [id, userId, referralCode, commissionType || 'percentage', commissionValue || 5.00, commissionThreshold || 0, 'bronze', 'auto'];
    const result = await db.query(query, values);
    return new Partner(result.rows[0]);
  }

  static getLevelPercentage(level) {
    return LEVEL_PERCENTAGES[level] || LEVEL_PERCENTAGES.bronze;
  }

  static resolveAutoLevel(totalReferredUsers = 0, totalLosses = 0) {
    if (totalReferredUsers >= 80 || totalLosses >= 50000) return 'diamond';
    if (totalReferredUsers >= 40 || totalLosses >= 20000) return 'platinum';
    if (totalReferredUsers >= 15 || totalLosses >= 10000) return 'gold';
    if (totalReferredUsers >= 5 || totalLosses >= 3000) return 'silver';
    return 'bronze';
  }

  static async findById(id) {
    const query = `
      SELECT p.*, u.username, u.email 
      FROM partners p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  static async findByUserId(userId) {
    const query = `
      SELECT p.*, u.username, u.email 
      FROM partners p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  static async findByReferralCode(code) {
    const query = `
      SELECT p.*, u.username, u.email 
      FROM partners p
      JOIN users u ON u.id = p.user_id
      WHERE p.referral_code = $1 AND p.is_active = true
    `;
    const result = await db.query(query, [code]);
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  static async findAll({ page = 1, limit = 20, active } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const values = [];

    if (active !== undefined) {
      values.push(active);
      whereClause = `WHERE p.is_active = $${values.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM partners p ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const query = `
      SELECT p.*, u.username, u.email
      FROM partners p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const result = await db.query(query, values);

    return {
      partners: result.rows.map(row => new Partner(row)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async updateConfig(id, { commissionType, commissionValue, commissionThreshold, validationPeriodHours, partnerLevel, levelMode }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (commissionType !== undefined) { fields.push(`commission_type = $${idx++}`); values.push(commissionType); }
    if (commissionValue !== undefined) { fields.push(`commission_value = $${idx++}`); values.push(commissionValue); }
    if (commissionThreshold !== undefined) { fields.push(`commission_threshold = $${idx++}`); values.push(commissionThreshold); }
    if (validationPeriodHours !== undefined) { fields.push(`validation_period_hours = $${idx++}`); values.push(validationPeriodHours); }
    if (partnerLevel !== undefined) { fields.push(`partner_level = $${idx++}`); values.push(partnerLevel); }
    if (levelMode !== undefined) { fields.push(`level_mode = $${idx++}`); values.push(levelMode); }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE partners SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  static async toggleActive(id, isActive) {
    const query = `UPDATE partners SET is_active = $1 WHERE id = $2 RETURNING *`;
    const result = await db.query(query, [isActive, id]);
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  static async incrementReferredUsers(id) {
    const query = `
      UPDATE partners 
      SET total_referred_users = total_referred_users + 1
      WHERE id = $1
    `;
    await db.query(query, [id]);
  }

  static async addPendingCommission(id, amount) {
    const query = `
      UPDATE partners 
      SET pending_commission = pending_commission + $1
      WHERE id = $2
    `;
    await db.query(query, [amount, id]);
  }

  static async validatePendingCommissions(partnerId, forceImmediate = false) {
    // Move comissões pendentes para o saldo.
    // Quando forceImmediate = true, ignora a janela de validação por horas.
    const params = [];
    let partnerFilter = '';
    let validationWindowFilter = '';
    if (partnerId) {
      params.push(partnerId);
      partnerFilter = ` AND partner_id = $${params.length}`;
    }

    if (!forceImmediate) {
      validationWindowFilter = `
        AND created_at < NOW() - (
          SELECT INTERVAL '1 hour' * p.validation_period_hours
          FROM partners p WHERE p.id = partner_commissions.partner_id
        )
      `;
    }

    const query = `
      UPDATE partner_commissions 
      SET status = 'validated', validated_at = NOW()
      WHERE status = 'pending' 
        ${partnerFilter}
        ${validationWindowFilter}
      RETURNING partner_id, commission_amount
    `;
    const result = await db.query(query, params);

    // Agrupar por parceiro e atualizar saldos
    const partnerTotals = {};
    for (const row of result.rows) {
      partnerTotals[row.partner_id] = (partnerTotals[row.partner_id] || 0) + parseFloat(row.commission_amount);
    }

    for (const [partnerId, total] of Object.entries(partnerTotals)) {
      await db.query(
        `UPDATE partners 
         SET commission_balance = commission_balance + $1,
             pending_commission = GREATEST(pending_commission - $1, 0),
             total_commissions_earned = total_commissions_earned + $1
         WHERE id = $2`,
        [total, partnerId]
      );
    }

    return result.rows.length;
  }

  /**
   * Retorna os usuários indicados por este parceiro
   */
  static async getReferredUsers(partnerId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await db.query(
      'SELECT COUNT(*) FROM users WHERE referred_by = $1',
      [partnerId]
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT u.id, u.username, u.email, u.created_at, u.is_active,
        COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins,
        COALESCE(
          SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END) - 
          SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 
          0
        ) as net_loss,
        (SELECT COALESCE(SUM(pc.commission_amount), 0) 
         FROM partner_commissions pc 
         WHERE pc.partner_id = $1 AND pc.referred_user_id = u.id
        ) as commissions_generated
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'completed'
      WHERE u.referred_by = $1
      GROUP BY u.id, u.username, u.email, u.created_at, u.is_active
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [partnerId, limit, offset]);

    return {
      users: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Estatísticas do parceiro
   */
  static async getStats(partnerId) {
    const [partnerResult, commissionsResult, monthlyResult] = await Promise.all([
      db.query('SELECT * FROM partners WHERE id = $1', [partnerId]),
      db.query(`
        SELECT 
          COUNT(*) as total_commissions,
          COALESCE(SUM(commission_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'validated' THEN commission_amount ELSE 0 END), 0) as validated_amount,
          COALESCE(SUM(loss_amount), 0) as total_losses_referred
        FROM partner_commissions WHERE partner_id = $1
      `, [partnerId]),
      db.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as commissions_count,
          COALESCE(SUM(commission_amount), 0) as amount
        FROM partner_commissions 
        WHERE partner_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `, [partnerId]),
    ]);

    const partner = partnerResult.rows[0];
    const stats = commissionsResult.rows[0];

    return {
      totalReferredUsers: partner ? partner.total_referred_users : 0,
      commissionBalance: partner ? parseFloat(partner.commission_balance) : 0,
      pendingCommission: partner ? parseFloat(partner.pending_commission) : 0,
      totalCommissionsEarned: partner ? parseFloat(partner.total_commissions_earned) : 0,
      totalCommissions: parseInt(stats.total_commissions),
      totalLossesReferred: parseFloat(stats.total_losses_referred),
      pendingAmount: parseFloat(stats.pending_amount),
      validatedAmount: parseFloat(stats.validated_amount),
      monthly: monthlyResult.rows,
    };
  }

  /**
   * Busca avançada de parceiros com filtros
   */
  static async search({ page = 1, limit = 20, search, status, commissionType, dateFrom, dateTo, sortBy = 'created_at', sortOrder = 'DESC' } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(`(u.username ILIKE $${idx} OR u.email ILIKE $${idx} OR p.referral_code ILIKE $${idx} OR CAST(p.id AS TEXT) ILIKE $${idx})`);
    }

    if (status === 'active') {
      conditions.push('p.is_active = true');
    } else if (status === 'blocked' || status === 'inactive') {
      conditions.push('p.is_active = false');
    }

    if (commissionType && ['percentage', 'fixed'].includes(commissionType)) {
      values.push(commissionType);
      conditions.push(`p.commission_type = $${values.length}`);
    }

    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(`p.created_at >= $${values.length}`);
    }

    if (dateTo) {
      values.push(dateTo);
      conditions.push(`p.created_at <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validar sortBy
    const allowedSort = {
      'created_at': 'p.created_at',
      'total_referred_users': 'p.total_referred_users',
      'total_commissions_earned': 'p.total_commissions_earned',
      'commission_balance': 'p.commission_balance',
      'pending_commission': 'p.pending_commission',
      'username': 'u.username',
    };
    const orderCol = allowedSort[sortBy] || 'p.created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const countQuery = `SELECT COUNT(*) FROM partners p JOIN users u ON u.id = p.user_id ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const query = `
      SELECT p.*, u.username, u.email,
        (SELECT MAX(pc.created_at) FROM partner_commissions pc WHERE pc.partner_id = p.id) as last_activity,
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = p.id AND u2.is_active = true) as active_referred_users,
        (SELECT COALESCE(SUM(pc2.loss_amount), 0) FROM partner_commissions pc2 WHERE pc2.partner_id = p.id) as total_losses
      FROM partners p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY ${orderCol} ${order}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}
    `;
    const result = await db.query(query, dataValues);

    return {
      partners: result.rows.map(row => ({
        ...new Partner(row).toJSON(),
        lastActivity: row.last_activity,
        activeReferredUsers: parseInt(row.active_referred_users || 0),
        totalLosses: parseFloat(row.total_losses || 0),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Métricas gerais do sistema de parceiros (admin dashboard)
   */
  static async getAdminMetrics() {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.is_active = true) as active_partners,
        COUNT(*) as total_partners,
        COALESCE(SUM(p.total_referred_users), 0) as total_referred,
        COALESCE(SUM(p.pending_commission), 0) as total_pending_commission,
        COALESCE(SUM(p.total_commissions_earned), 0) as total_commissions_paid,
        (SELECT COALESCE(SUM(pc.loss_amount), 0) FROM partner_commissions pc) as total_losses,
        (SELECT COUNT(*) FROM partner_withdrawals pw WHERE pw.status = 'pending') as pending_withdrawals
      FROM partners p
    `);
    const row = result.rows[0];
    return {
      activePartners: parseInt(row.active_partners || 0),
      totalPartners: parseInt(row.total_partners || 0),
      totalReferred: parseInt(row.total_referred || 0),
      totalPendingCommission: parseFloat(row.total_pending_commission || 0),
      totalCommissionsPaid: parseFloat(row.total_commissions_paid || 0),
      totalLosses: parseFloat(row.total_losses || 0),
      pendingWithdrawals: parseInt(row.pending_withdrawals || 0),
    };
  }

  /**
   * Ranking de parceiros
   */
  static async getRanking({ page = 1, limit = 20, sortBy = 'total_commissions_earned' } = {}) {
    const offset = (page - 1) * limit;

    const allowedSort = {
      'total_commissions_earned': 'p.total_commissions_earned',
      'total_referred_users': 'p.total_referred_users',
      'total_losses': 'total_losses',
    };
    const orderCol = allowedSort[sortBy] || 'p.total_commissions_earned';

    const countResult = await db.query('SELECT COUNT(*) FROM partners WHERE is_active = true');
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT p.*, u.username, u.email,
        COALESCE((SELECT SUM(pc.loss_amount) FROM partner_commissions pc WHERE pc.partner_id = p.id), 0) as total_losses,
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = p.id AND u2.is_active = true) as active_referred_users
      FROM partners p
      JOIN users u ON u.id = p.user_id
      WHERE p.is_active = true
      ORDER BY ${orderCol} DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);

    return {
      ranking: result.rows.map((row, idx) => ({
        position: offset + idx + 1,
        ...new Partner(row).toJSON(),
        totalLosses: parseFloat(row.total_losses || 0),
        activeReferredUsers: parseInt(row.active_referred_users || 0),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Comissões pendentes de todos os parceiros (admin)
   */
  static async getPendingCommissions({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      "SELECT COUNT(*) FROM partner_commissions WHERE status = 'pending'"
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT pc.*, 
        u.username as referred_username,
        p.referral_code,
        pu.username as partner_username
      FROM partner_commissions pc
      JOIN users u ON u.id = pc.referred_user_id
      JOIN partners p ON p.id = pc.partner_id
      JOIN users pu ON pu.id = p.user_id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);

    return {
      commissions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Regenerar código de indicação
   */
  static async regenerateCode(id) {
    const crypto = require('crypto');
    const partner = await Partner.findById(id);
    if (!partner) return null;

    const prefix = (partner.username || 'P').substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const suffix = crypto.randomBytes(3).toString('hex').substring(0, 4).toUpperCase();
    const newCode = `${prefix}${suffix}`;

    const result = await db.query(
      'UPDATE partners SET referral_code = $1 WHERE id = $2 RETURNING *',
      [newCode, id]
    );
    return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
  }

  /**
   * Excluir parceiro (soft: desativar e desvincular)
   */
  static async deletePartner(id) {
    await db.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [id]);
    await db.query('DELETE FROM partner_commissions WHERE partner_id = $1', [id]);
    await db.query('DELETE FROM partner_withdrawals WHERE partner_id = $1', [id]);
    await db.query('DELETE FROM partners WHERE id = $1', [id]);
    return true;
  }

  /**
   * Histórico de comissões de um parceiro (admin)
   */
  static async getCommissionHistory(partnerId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      'SELECT COUNT(*) FROM partner_commissions WHERE partner_id = $1',
      [partnerId]
    );
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT pc.*, u.username as referred_username
      FROM partner_commissions pc
      JOIN users u ON u.id = pc.referred_user_id
      WHERE pc.partner_id = $1
      ORDER BY pc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [partnerId, limit, offset]);

    return {
      commissions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      referralCode: this.referralCode,
      commissionType: this.commissionType,
      commissionValue: this.commissionValue,
      commissionThreshold: this.commissionThreshold,
      isActive: this.isActive,
      totalReferredUsers: this.totalReferredUsers,
      totalCommissionsEarned: this.totalCommissionsEarned,
      commissionBalance: this.commissionBalance,
      pendingCommission: this.pendingCommission,
      validationPeriodHours: this.validationPeriodHours,
      partnerLevel: this.partnerLevel,
      levelMode: this.levelMode,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Partner;
