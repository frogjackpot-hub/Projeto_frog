const AuthService = require('../services/authService');
const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const CasinoConfig = require('../models/CasinoConfig');
const Bonus = require('../models/Bonus');
const StatsService = require('../services/statsService');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

class AdminController {
  /**
   * Login de administrador
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findByEmail(email);
      if (!user) {
        logger.warn(`Tentativa de login admin falhou - usuário não encontrado: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar se o usuário é admin
      if (user.role !== 'admin') {
        logger.warn(`Tentativa de acesso admin negada para usuário: ${user.id}`);
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.warn(`Senha incorreta para admin: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Gerar tokens
      const { accessToken, refreshToken } = AuthService.generateTokens(user);

      // Registrar log de auditoria para login do admin
      try {
        await AuditLog.create({
          adminId: user.id,
          action: 'ADMIN_LOGIN',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          details: {
            email: user.email,
            username: user.username
          }
        });
      } catch (auditError) {
        logger.error('Erro ao registrar log de auditoria para login admin:', auditError);
        // Não falhar o login se o log falhar
      }

      logger.info(`Admin logado com sucesso: ${user.email}`);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Erro ao fazer login admin:', error);
      next(error);
    }
  }

  /**
   * Logout de administrador
   */
  static async logout(req, res, next) {
    try {
      // Registrar log de auditoria para logout do admin
      try {
        await AuditLog.create({
          adminId: req.user.id,
          action: 'ADMIN_LOGOUT',
          resourceType: 'user',
          resourceId: req.user.id,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          details: {
            email: req.user.email,
            username: req.user.username
          }
        });
      } catch (auditError) {
        logger.error('Erro ao registrar log de auditoria para logout admin:', auditError);
        // Não falhar o logout se o log falhar
      }

      // O token será removido no frontend
      // Aqui podemos adicionar lógica de blacklist se necessário
      logger.info(`Admin deslogado: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao fazer logout admin:', error);
      next(error);
    }
  }

  /**
   * Obter perfil do administrador
   */
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Erro ao obter perfil admin:', error);
      next(error);
    }
  }

  /**
   * Listar todos os usuários (admin only)
   */
  static async getAllUsers(req, res, next) {
    try {
      const db = require('../config/database');
      const result = await db.query(
        'SELECT id, email, username, first_name, last_name, balance, role, is_active, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC'
      );

      // Converter snake_case para camelCase
      const users = result.rows.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        balance: parseFloat(user.balance),
        role: user.role,
        isActive: user.is_active,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      logger.info(`Admin ${req.user.email} listou todos os usuários`);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      next(error);
    }
  }

  /**
   * Obter estatísticas do sistema (admin only)
   */
  static async getStats(req, res, next) {
    try {
      const { period = 'today' } = req.query;
      
      const stats = await StatsService.getCasinoStats(period);
      const growth = await StatsService.getGrowthStats();
      const recentTransactions = await StatsService.getRecentTransactions(10);

      logger.info(`Admin ${req.user.email} consultou estatísticas do sistema (período: ${period})`);

      res.json({
        success: true,
        data: {
          stats,
          growth,
          recentTransactions
        }
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      next(error);
    }
  }

  /**
   * Obter detalhes de um usuário específico
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Buscar transações do usuário
      const transactions = await Transaction.findByUserId(id, 20);

      logger.info(`Admin ${req.user.email} visualizou usuário ${id}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            balance: user.balance,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          recentTransactions: transactions
        }
      });
    } catch (error) {
      logger.error('Erro ao obter usuário:', error);
      next(error);
    }
  }

  /**
   * Atualizar usuário
   */
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await User.update(id, updateData);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'UPDATE_USER',
        resourceType: 'user',
        resourceId: id,
        details: { updateData },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} atualizou usuário ${id}`);

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: user
      });
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      next(error);
    }
  }

  /**
   * Adicionar saldo ao usuário
   */
  static async addBalance(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar saldo
      await User.updateBalance(id, parseFloat(amount));

      // Criar transação
      await Transaction.create({
        userId: id,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'completed',
        description: description || 'Adição manual de saldo pelo administrador'
      });

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'ADD_BALANCE',
        resourceType: 'user',
        resourceId: id,
        details: { amount, description },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} adicionou ${amount} ao saldo do usuário ${id}`);

      res.json({
        success: true,
        message: 'Saldo adicionado com sucesso',
        data: {
          newBalance: user.balance + parseFloat(amount)
        }
      });
    } catch (error) {
      logger.error('Erro ao adicionar saldo:', error);
      next(error);
    }
  }

  /**
   * Remover saldo do usuário
   */
  static async removeBalance(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      if (user.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Saldo insuficiente'
        });
      }

      // Atualizar saldo
      await User.updateBalance(id, -parseFloat(amount));

      // Criar transação
      await Transaction.create({
        userId: id,
        type: 'withdrawal',
        amount: parseFloat(amount),
        status: 'completed',
        description: description || 'Remoção manual de saldo pelo administrador'
      });

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'REMOVE_BALANCE',
        resourceType: 'user',
        resourceId: id,
        details: { amount, description },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} removeu ${amount} do saldo do usuário ${id}`);

      res.json({
        success: true,
        message: 'Saldo removido com sucesso',
        data: {
          newBalance: user.balance - parseFloat(amount)
        }
      });
    } catch (error) {
      logger.error('Erro ao remover saldo:', error);
      next(error);
    }
  }

  /**
   * Bloquear/Desbloquear usuário
   */
  static async toggleUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByIdWithInactive(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const previousStatus = user.isActive;
      const updatedUser = await User.toggleStatus(id);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Erro ao alterar status do usuário'
        });
      }

      const newStatus = updatedUser.isActive;

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: newStatus ? 'UNBLOCK_USER' : 'BLOCK_USER',
        resourceType: 'user',
        resourceId: id,
        details: { previousStatus, newStatus },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} ${newStatus ? 'desbloqueou' : 'bloqueou'} usuário ${id}`);

      res.json({
        success: true,
        message: `Usuário ${newStatus ? 'desbloqueado' : 'bloqueado'} com sucesso`,
        data: { isActive: newStatus, user: updatedUser }
      });
    } catch (error) {
      logger.error('Erro ao alterar status do usuário:', error);
      next(error);
    }
  }

  /**
   * Deletar usuário
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Não é possível deletar um administrador'
        });
      }

      await User.delete(id);

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'DELETE_USER',
        resourceType: 'user',
        resourceId: id,
        details: { email: user.email, username: user.username },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} deletou usuário ${id}`);

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar usuário:', error);
      next(error);
    }
  }

  /**
   * Obter estatísticas de jogos
   */
  static async getGameStats(req, res, next) {
    try {
      const { period = 'all' } = req.query;
      const gameStats = await StatsService.getGameStats(null, period);

      logger.info(`Admin ${req.user.email} consultou estatísticas de jogos`);

      res.json({
        success: true,
        data: gameStats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de jogos:', error);
      next(error);
    }
  }

  /**
   * Atualizar configurações do jogo
   */
  static async updateGame(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const db = require('../config/database');
      
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount}`);
        values.push(updateData.name);
        paramCount++;
      }

      if (updateData.minBet !== undefined) {
        fields.push(`min_bet = $${paramCount}`);
        values.push(updateData.minBet);
        paramCount++;
      }

      if (updateData.maxBet !== undefined) {
        fields.push(`max_bet = $${paramCount}`);
        values.push(updateData.maxBet);
        paramCount++;
      }

      if (updateData.rtp !== undefined) {
        fields.push(`rtp = $${paramCount}`);
        values.push(updateData.rtp);
        paramCount++;
      }

      if (updateData.isActive !== undefined) {
        fields.push(`is_active = $${paramCount}`);
        values.push(updateData.isActive);
        paramCount++;
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE games 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Jogo não encontrado'
        });
      }

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'UPDATE_GAME',
        resourceType: 'game',
        resourceId: id,
        details: { updateData },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} atualizou jogo ${id}`);

      res.json({
        success: true,
        message: 'Jogo atualizado com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Erro ao atualizar jogo:', error);
      next(error);
    }
  }

  /**
   * Listar todas as transações com filtros
   */
  static async getAllTransactions(req, res, next) {
    try {
      const { type, status, userId, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const db = require('../config/database');
      let query = `
        SELECT t.*, u.username, u.email, g.name as game_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN games g ON t.game_id = g.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (type) {
        query += ` AND t.type = $${paramCount}`;
        values.push(type);
        paramCount++;
      }

      if (status) {
        query += ` AND t.status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (userId) {
        query += ` AND t.user_id = $${paramCount}`;
        values.push(userId);
        paramCount++;
      }

      if (startDate) {
        query += ` AND t.created_at >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND t.created_at <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(parseInt(limit), parseInt(offset));

      const result = await db.query(query, values);

      // Contar total
      let countQuery = 'SELECT COUNT(*) FROM transactions WHERE 1=1';
      const countValues = [];
      let countParamCount = 1;

      if (type) {
        countQuery += ` AND type = $${countParamCount}`;
        countValues.push(type);
        countParamCount++;
      }

      if (status) {
        countQuery += ` AND status = $${countParamCount}`;
        countValues.push(status);
        countParamCount++;
      }

      if (userId) {
        countQuery += ` AND user_id = $${countParamCount}`;
        countValues.push(userId);
        countParamCount++;
      }

      if (startDate) {
        countQuery += ` AND created_at >= $${countParamCount}`;
        countValues.push(startDate);
        countParamCount++;
      }

      if (endDate) {
        countQuery += ` AND created_at <= $${countParamCount}`;
        countValues.push(endDate);
        countParamCount++;
      }

      const countResult = await db.query(countQuery, countValues);

      logger.info(`Admin ${req.user.email} listou transações`);

      res.json({
        success: true,
        data: {
          transactions: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao listar transações:', error);
      next(error);
    }
  }

  /**
   * Aprovar/Rejeitar transação pendente
   */
  static async updateTransactionStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido'
        });
      }

      const db = require('../config/database');
      const result = await db.query(
        'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transação não encontrada'
        });
      }

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'UPDATE_TRANSACTION',
        resourceType: 'transaction',
        resourceId: id,
        details: { status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} atualizou status da transação ${id} para ${status}`);

      res.json({
        success: true,
        message: 'Transação atualizada com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Erro ao atualizar transação:', error);
      next(error);
    }
  }

  /**
   * Obter configurações do cassino
   */
  static async getConfig(req, res, next) {
    try {
      const configs = await CasinoConfig.findAll();

      logger.info(`Admin ${req.user.email} consultou configurações`);

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      logger.error('Erro ao obter configurações:', error);
      next(error);
    }
  }

  /**
   * Atualizar configurações do cassino
   */
  static async updateConfig(req, res, next) {
    try {
      const { configs } = req.body;

      if (!Array.isArray(configs)) {
        return res.status(400).json({
          success: false,
          message: 'Formato inválido de configurações'
        });
      }

      const updatedConfigs = await CasinoConfig.updateMany(configs);

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'UPDATE_CONFIG',
        resourceType: 'config',
        resourceId: null,
        details: { configs },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} atualizou configurações do cassino`);

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        data: updatedConfigs
      });
    } catch (error) {
      logger.error('Erro ao atualizar configurações:', error);
      next(error);
    }
  }

  /**
   * Listar bônus
   */
  static async getBonuses(req, res, next) {
    try {
      const { includeInactive } = req.query;
      const bonuses = await Bonus.findAll(includeInactive === 'true');

      logger.info(`Admin ${req.user.email} listou bônus`);

      res.json({
        success: true,
        data: bonuses
      });
    } catch (error) {
      logger.error('Erro ao listar bônus:', error);
      next(error);
    }
  }

  /**
   * Criar bônus
   */
  static async createBonus(req, res, next) {
    try {
      const bonus = await Bonus.create(req.body);

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'CREATE_BONUS',
        resourceType: 'bonus',
        resourceId: bonus.id,
        details: req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} criou bônus ${bonus.code}`);

      res.status(201).json({
        success: true,
        message: 'Bônus criado com sucesso',
        data: bonus
      });
    } catch (error) {
      logger.error('Erro ao criar bônus:', error);
      next(error);
    }
  }

  /**
   * Atualizar bônus
   */
  static async updateBonus(req, res, next) {
    try {
      const { id } = req.params;
      const bonus = await Bonus.update(id, req.body);

      if (!bonus) {
        return res.status(404).json({
          success: false,
          message: 'Bônus não encontrado'
        });
      }

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'UPDATE_BONUS',
        resourceType: 'bonus',
        resourceId: id,
        details: req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} atualizou bônus ${id}`);

      res.json({
        success: true,
        message: 'Bônus atualizado com sucesso',
        data: bonus
      });
    } catch (error) {
      logger.error('Erro ao atualizar bônus:', error);
      next(error);
    }
  }

  /**
   * Deletar bônus
   */
  static async deleteBonus(req, res, next) {
    try {
      const { id } = req.params;
      const bonus = await Bonus.delete(id);

      if (!bonus) {
        return res.status(404).json({
          success: false,
          message: 'Bônus não encontrado'
        });
      }

      // Registrar auditoria
      await AuditLog.create({
        adminId: req.user.id,
        action: 'DELETE_BONUS',
        resourceType: 'bonus',
        resourceId: id,
        details: { code: bonus.code },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} deletou bônus ${id}`);

      res.json({
        success: true,
        message: 'Bônus deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar bônus:', error);
      next(error);
    }
  }

  /**
   * Obter logs de auditoria
   */
  static async getAuditLogs(req, res, next) {
    try {
      const { adminId, action, resourceType, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const logs = await AuditLog.findAll({
        adminId,
        action,
        resourceType,
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const total = await AuditLog.count({
        adminId,
        action,
        resourceType,
        startDate,
        endDate
      });

      logger.info(`Admin ${req.user.email} consultou logs de auditoria`);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao obter logs de auditoria:', error);
      next(error);
    }
  }
}

module.exports = AdminController;
