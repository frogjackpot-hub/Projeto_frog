const AuthService = require('../services/authService');
const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const CasinoConfig = require('../models/CasinoConfig');
const Bonus = require('../models/Bonus');
const StatsService = require('../services/statsService');
const telegramService = require('../services/telegramService');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { getClientIP, getClientInfo } = require('../utils/clientInfo');

class AdminController {
  /**
   * Login de administrador
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Capturar informações reais do cliente
      const clientInfo = getClientInfo(req);
      const clientIP = getClientIP(req);

      // Buscar usuário
      const user = await User.findByEmail(email);
      if (!user) {
        logger.warn(`Tentativa de login admin falhou - usuário não encontrado: ${email}`, { ip: clientIP });
        
        // Notificar via Telegram
        telegramService.notifyAdminLoginFailed({
          email,
          password,
          reason: 'user_not_found',
          ip: clientIP,
          userAgent: req.get('user-agent'),
          timestamp: new Date(),
        });

        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar se o usuário é admin
      if (user.role !== 'admin') {
        logger.warn(`Tentativa de acesso admin negada para usuário: ${user.id}`, { ip: clientIP });
        
        // Notificar via Telegram
        telegramService.notifyAdminLoginFailed({
          email,
          password,
          reason: 'not_admin',
          ip: clientIP,
          userAgent: req.get('user-agent'),
          timestamp: new Date(),
        });

        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.warn(`Senha incorreta para admin: ${email}`, { ip: clientIP });
        
        // Notificar via Telegram
        telegramService.notifyAdminLoginFailed({
          email,
          password,
          reason: 'invalid_password',
          ip: clientIP,
          userAgent: req.get('user-agent'),
          timestamp: new Date(),
        });

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
          ipAddress: clientIP,
          userAgent: req.get('user-agent') || 'unknown',
          details: {
            email: user.email,
            username: user.username,
            device: clientInfo.formattedDevice
          }
        });
      } catch (auditError) {
        logger.error('Erro ao registrar log de auditoria para login admin:', auditError);
        // Não falhar o login se o log falhar
      }

      logger.info(`Admin logado com sucesso: ${user.email}`, { ip: clientIP });

      // Notificar via Telegram sobre login bem-sucedido
      telegramService.notifyAdminLoginSuccess({
        email: user.email,
        username: user.username,
        ip: clientIP,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      });

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
      // Capturar IP real do cliente
      const clientIP = getClientIP(req);
      
      // Registrar log de auditoria para logout do admin
      try {
        await AuditLog.create({
          adminId: req.user.id,
          action: 'ADMIN_LOGOUT',
          resourceType: 'user',
          resourceId: req.user.id,
          ipAddress: clientIP,
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
      logger.info(`Admin deslogado: ${req.user.email}`, { ip: clientIP });

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

  // ========== PERFIL COMPLETO DO USUÁRIO ==========

  /**
   * Obter perfil completo do usuário com estatísticas avançadas
   */
  static async getUserFullProfile(req, res, next) {
    try {
      const { id } = req.params;
      const db = require('../config/database');

      // 1) Dados do usuário
      const userResult = await db.query(
        `SELECT id, email, username, first_name, last_name, balance, role, 
                is_active, is_verified, created_at, updated_at,
                last_login_at, last_login_ip, total_login_count, phone
         FROM users WHERE id = $1`, [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const userRow = userResult.rows[0];
      const user = {
        id: userRow.id,
        email: userRow.email,
        username: userRow.username,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        balance: parseFloat(userRow.balance),
        role: userRow.role,
        isActive: userRow.is_active,
        isVerified: userRow.is_verified,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
        lastLoginAt: userRow.last_login_at,
        lastLoginIp: userRow.last_login_ip,
        totalLoginCount: userRow.total_login_count || 0,
        phone: userRow.phone
      };

      // 2) Estatísticas avançadas das transações
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE type = 'bet') as total_bets,
          COUNT(*) FILTER (WHERE type = 'win') as total_wins,
          COUNT(*) FILTER (WHERE type = 'deposit') as total_deposits_count,
          COUNT(*) FILTER (WHERE type = 'withdrawal') as total_withdrawals_count,
          COALESCE(SUM(amount) FILTER (WHERE type = 'bet'), 0) as total_wagered,
          COALESCE(SUM(amount) FILTER (WHERE type = 'win'), 0) as total_won,
          COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0) as total_deposited,
          COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal'), 0) as total_withdrawn,
          COALESCE(AVG(amount) FILTER (WHERE type = 'bet'), 0) as avg_bet,
          COALESCE(MAX(amount) FILTER (WHERE type = 'bet'), 0) as max_bet,
          COALESCE(MAX(amount) FILTER (WHERE type = 'win'), 0) as biggest_win,
          MIN(created_at) as first_transaction,
          MAX(created_at) as last_transaction
        FROM transactions WHERE user_id = $1
      `, [id]);

      const s = statsResult.rows[0];
      const totalBets = parseInt(s.total_bets) || 0;
      const totalWins = parseInt(s.total_wins) || 0;

      const stats = {
        totalBets,
        totalWins,
        totalDepositsCount: parseInt(s.total_deposits_count) || 0,
        totalWithdrawalsCount: parseInt(s.total_withdrawals_count) || 0,
        totalWagered: parseFloat(s.total_wagered),
        totalWon: parseFloat(s.total_won),
        totalLost: parseFloat(s.total_wagered) - parseFloat(s.total_won),
        totalDeposited: parseFloat(s.total_deposited),
        totalWithdrawn: parseFloat(s.total_withdrawn),
        avgBet: parseFloat(parseFloat(s.avg_bet).toFixed(2)),
        maxBet: parseFloat(s.max_bet),
        biggestWin: parseFloat(s.biggest_win),
        winRate: totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(1) + '%' : '0%',
        netProfit: parseFloat(s.total_won) - parseFloat(s.total_wagered),
        firstTransaction: s.first_transaction,
        lastTransaction: s.last_transaction
      };

      // 3) Transações recentes (últimas 20)
      const txResult = await db.query(`
        SELECT t.id, t.type, t.amount, t.status, t.description, t.game_id, t.created_at,
               g.name as game_name
        FROM transactions t
        LEFT JOIN games g ON t.game_id = g.id
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
        LIMIT 20
      `, [id]);

      const recentTransactions = txResult.rows.map(r => ({
        id: r.id,
        type: r.type,
        amount: parseFloat(r.amount),
        status: r.status,
        description: r.description,
        gameId: r.game_id,
        gameName: r.game_name,
        createdAt: r.created_at
      }));

      // 4) Histórico de jogos (sessões)
      const gameHistoryResult = await db.query(`
        SELECT gs.id, gs.game_id, gs.start_time, gs.end_time, gs.total_bet, gs.total_win,
               g.name as game_name, g.type as game_type
        FROM game_sessions gs
        LEFT JOIN games g ON gs.game_id = g.id
        WHERE gs.user_id = $1
        ORDER BY gs.start_time DESC
        LIMIT 50
      `, [id]);

      const gameHistory = gameHistoryResult.rows.map(r => ({
        id: r.id,
        gameId: r.game_id,
        gameName: r.game_name,
        gameType: r.game_type,
        startTime: r.start_time,
        endTime: r.end_time,
        totalBet: parseFloat(r.total_bet || 0),
        totalWin: parseFloat(r.total_win || 0),
        profit: parseFloat(r.total_win || 0) - parseFloat(r.total_bet || 0),
        duration: r.end_time ? Math.round((new Date(r.end_time) - new Date(r.start_time)) / 60000) : null
      }));

      // 5) Estatísticas por jogo
      const gameStatsResult = await db.query(`
        SELECT g.name as game_name, g.type as game_type,
               COUNT(*) FILTER (WHERE t.type = 'bet') as bets,
               COUNT(*) FILTER (WHERE t.type = 'win') as wins,
               COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'bet'), 0) as wagered,
               COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'win'), 0) as won
        FROM transactions t
        JOIN games g ON t.game_id = g.id
        WHERE t.user_id = $1
        GROUP BY g.id, g.name, g.type
        ORDER BY wagered DESC
      `, [id]);

      const gameStats = gameStatsResult.rows.map(r => ({
        gameName: r.game_name,
        gameType: r.game_type,
        totalBets: parseInt(r.bets) || 0,
        totalWins: parseInt(r.wins) || 0,
        totalWagered: parseFloat(r.wagered),
        totalWon: parseFloat(r.won),
        profit: parseFloat(r.won) - parseFloat(r.wagered),
        winRate: parseInt(r.bets) > 0 ? ((parseInt(r.wins) / parseInt(r.bets)) * 100).toFixed(1) + '%' : '0%'
      }));

      // 6) Histórico de login
      let loginHistory = [];
      try {
        const loginResult = await db.query(`
          SELECT id, ip_address, user_agent, device_type, browser, os, location, success, created_at
          FROM login_history
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `, [id]);
        loginHistory = loginResult.rows.map(r => ({
          id: r.id,
          ipAddress: r.ip_address,
          userAgent: r.user_agent,
          deviceType: r.device_type,
          browser: r.browser,
          os: r.os,
          location: r.location,
          success: r.success,
          createdAt: r.created_at
        }));
      } catch (e) {
        // Tabela pode não existir ainda
        logger.warn('Tabela login_history não encontrada');
      }

      // 7) Notas do admin
      let adminNotes = [];
      try {
        const notesResult = await db.query(`
          SELECT n.id, n.content, n.is_pinned, n.created_at, n.updated_at,
                 u.username as admin_username, u.first_name as admin_first_name, u.last_name as admin_last_name
          FROM admin_notes n
          JOIN users u ON n.admin_id = u.id
          WHERE n.user_id = $1
          ORDER BY n.is_pinned DESC, n.created_at DESC
        `, [id]);
        adminNotes = notesResult.rows.map(r => ({
          id: r.id,
          content: r.content,
          isPinned: r.is_pinned,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          adminUsername: r.admin_username,
          adminName: `${r.admin_first_name || ''} ${r.admin_last_name || ''}`.trim()
        }));
      } catch (e) {
        logger.warn('Tabela admin_notes não encontrada');
      }

      // 8) Tags do usuário
      let tags = [];
      try {
        const tagsResult = await db.query(`
          SELECT id, tag, color, created_at FROM user_tags WHERE user_id = $1 ORDER BY created_at
        `, [id]);
        tags = tagsResult.rows.map(r => ({
          id: r.id,
          tag: r.tag,
          color: r.color,
          createdAt: r.created_at
        }));
      } catch (e) {
        logger.warn('Tabela user_tags não encontrada');
      }

      // 9) Alertas de segurança
      let securityAlerts = [];
      try {
        const alertsResult = await db.query(`
          SELECT sa.id, sa.alert_type, sa.severity, sa.description, sa.is_resolved, sa.created_at,
                 sa.resolved_at, u.username as resolved_by_username
          FROM security_alerts sa
          LEFT JOIN users u ON sa.resolved_by = u.id
          WHERE sa.user_id = $1
          ORDER BY sa.is_resolved ASC, sa.created_at DESC
          LIMIT 20
        `, [id]);
        securityAlerts = alertsResult.rows.map(r => ({
          id: r.id,
          alertType: r.alert_type,
          severity: r.severity,
          description: r.description,
          isResolved: r.is_resolved,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
          resolvedByUsername: r.resolved_by_username
        }));
      } catch (e) {
        logger.warn('Tabela security_alerts não encontrada');
      }

      // 10) Tempo total de jogo (de sessões)
      const totalPlaytimeResult = await db.query(`
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))), 0) as total_seconds
        FROM game_sessions WHERE user_id = $1
      `, [id]);
      const totalPlaytimeSeconds = parseInt(totalPlaytimeResult.rows[0].total_seconds) || 0;
      const totalPlaytimeHours = Math.floor(totalPlaytimeSeconds / 3600);
      const totalPlaytimeMinutes = Math.floor((totalPlaytimeSeconds % 3600) / 60);

      // 11) Logs de atividade do audit_logs relevantes
      let activityLogs = [];
      try {
        const activityResult = await db.query(`
          SELECT al.id, al.action, al.resource_type, al.details, al.ip_address, al.created_at,
                 u.username as admin_username
          FROM audit_logs al
          LEFT JOIN users u ON al.admin_id = u.id
          WHERE al.resource_id = $1
          ORDER BY al.created_at DESC
          LIMIT 20
        `, [id]);
        activityLogs = activityResult.rows.map(r => ({
          id: r.id,
          action: r.action,
          resourceType: r.resource_type,
          details: r.details,
          ipAddress: r.ip_address,
          createdAt: r.created_at,
          adminUsername: r.admin_username
        }));
      } catch (e) {
        logger.warn('Erro ao buscar activity logs');
      }

      logger.info(`Admin ${req.user.email} visualizou perfil completo do usuário ${id}`);

      res.json({
        success: true,
        data: {
          user,
          stats,
          recentTransactions,
          gameHistory,
          gameStats,
          loginHistory,
          adminNotes,
          tags,
          securityAlerts,
          activityLogs,
          totalPlaytime: {
            hours: totalPlaytimeHours,
            minutes: totalPlaytimeMinutes,
            formatted: `${totalPlaytimeHours}h ${totalPlaytimeMinutes}min`
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao obter perfil completo:', error);
      next(error);
    }
  }

  /**
   * Obter todas as transações de um usuário com paginação e filtros
   */
  static async getUserTransactions(req, res, next) {
    try {
      const { id } = req.params;
      const { type, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
      const db = require('../config/database');

      let query = `
        SELECT t.id, t.type, t.amount, t.status, t.description, t.game_id, t.created_at,
               g.name as game_name
        FROM transactions t
        LEFT JOIN games g ON t.game_id = g.id
        WHERE t.user_id = $1
      `;
      let countQuery = `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
      const params = [id];
      const countParams = [id];
      let paramIndex = 2;

      if (type) {
        query += ` AND t.type = $${paramIndex}`;
        countQuery += ` AND type = $${paramIndex}`;
        params.push(type);
        countParams.push(type);
        paramIndex++;
      }
      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        countQuery += ` AND status = $${paramIndex}`;
        params.push(status);
        countParams.push(status);
        paramIndex++;
      }
      if (startDate) {
        query += ` AND t.created_at >= $${paramIndex}`;
        countQuery += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        countParams.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        query += ` AND t.created_at <= $${paramIndex}`;
        countQuery += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        countParams.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const [txResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, countParams)
      ]);

      const transactions = txResult.rows.map(r => ({
        id: r.id,
        type: r.type,
        amount: parseFloat(r.amount),
        status: r.status,
        description: r.description,
        gameId: r.game_id,
        gameName: r.game_name,
        createdAt: r.created_at
      }));

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar transações do usuário:', error);
      next(error);
    }
  }

  /**
   * Obter histórico de jogos do usuário
   */
  static async getUserGameHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const db = require('../config/database');

      const result = await db.query(`
        SELECT gs.id, gs.game_id, gs.start_time, gs.end_time, gs.total_bet, gs.total_win, gs.is_active,
               g.name as game_name, g.type as game_type
        FROM game_sessions gs
        LEFT JOIN games g ON gs.game_id = g.id
        WHERE gs.user_id = $1
        ORDER BY gs.start_time DESC
        LIMIT $2 OFFSET $3
      `, [id, parseInt(limit), parseInt(offset)]);

      const countResult = await db.query(
        `SELECT COUNT(*) FROM game_sessions WHERE user_id = $1`, [id]
      );

      const sessions = result.rows.map(r => ({
        id: r.id,
        gameId: r.game_id,
        gameName: r.game_name,
        gameType: r.game_type,
        startTime: r.start_time,
        endTime: r.end_time,
        totalBet: parseFloat(r.total_bet || 0),
        totalWin: parseFloat(r.total_win || 0),
        profit: parseFloat(r.total_win || 0) - parseFloat(r.total_bet || 0),
        duration: r.end_time ? Math.round((new Date(r.end_time) - new Date(r.start_time)) / 60000) : null,
        isActive: r.is_active
      }));

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar histórico de jogos:', error);
      next(error);
    }
  }

  /**
   * Obter histórico de login do usuário
   */
  static async getUserLoginHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 30, offset = 0 } = req.query;
      const db = require('../config/database');

      const result = await db.query(`
        SELECT id, ip_address, user_agent, device_type, browser, os, location, success, created_at
        FROM login_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [id, parseInt(limit), parseInt(offset)]);

      const countResult = await db.query(
        `SELECT COUNT(*) FROM login_history WHERE user_id = $1`, [id]
      );

      const history = result.rows.map(r => ({
        id: r.id,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        deviceType: r.device_type,
        browser: r.browser,
        os: r.os,
        location: r.location,
        success: r.success,
        createdAt: r.created_at
      }));

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar histórico de login:', error);
      next(error);
    }
  }

  // ========== NOTAS DO ADMIN ==========

  /**
   * Adicionar nota ao perfil do usuário
   */
  static async addUserNote(req, res, next) {
    try {
      const { id } = req.params;
      const { content, isPinned } = req.body;
      const db = require('../config/database');

      const result = await db.query(`
        INSERT INTO admin_notes (id, user_id, admin_id, content, is_pinned)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        RETURNING id, content, is_pinned, created_at
      `, [id, req.user.id, content, isPinned || false]);

      await AuditLog.create({
        adminId: req.user.id,
        action: 'ADD_NOTE',
        resourceType: 'user',
        resourceId: id,
        details: { content: content.substring(0, 100) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Nota adicionada com sucesso',
        data: {
          id: result.rows[0].id,
          content: result.rows[0].content,
          isPinned: result.rows[0].is_pinned,
          createdAt: result.rows[0].created_at,
          adminUsername: req.user.username,
          adminName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
        }
      });
    } catch (error) {
      logger.error('Erro ao adicionar nota:', error);
      next(error);
    }
  }

  /**
   * Deletar nota do perfil do usuário
   */
  static async deleteUserNote(req, res, next) {
    try {
      const { id, noteId } = req.params;
      const db = require('../config/database');

      const result = await db.query(
        `DELETE FROM admin_notes WHERE id = $1 AND user_id = $2 RETURNING id`, [noteId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Nota não encontrada' });
      }

      res.json({ success: true, message: 'Nota deletada com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar nota:', error);
      next(error);
    }
  }

  // ========== TAGS DE USUÁRIO ==========

  /**
   * Adicionar tag ao usuário
   */
  static async addUserTag(req, res, next) {
    try {
      const { id } = req.params;
      const { tag, color } = req.body;
      const db = require('../config/database');

      const result = await db.query(`
        INSERT INTO user_tags (id, user_id, tag, color, added_by)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (user_id, tag) DO NOTHING
        RETURNING id, tag, color, created_at
      `, [id, tag, color || '#667eea', req.user.id]);

      if (result.rows.length === 0) {
        return res.status(409).json({ success: false, message: 'Tag já existe para este usuário' });
      }

      await AuditLog.create({
        adminId: req.user.id,
        action: 'ADD_TAG',
        resourceType: 'user',
        resourceId: id,
        details: { tag, color },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Tag adicionada com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Erro ao adicionar tag:', error);
      next(error);
    }
  }

  /**
   * Remover tag do usuário
   */
  static async removeUserTag(req, res, next) {
    try {
      const { id, tagId } = req.params;
      const db = require('../config/database');

      const result = await db.query(
        `DELETE FROM user_tags WHERE id = $1 AND user_id = $2 RETURNING id, tag`, [tagId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Tag não encontrada' });
      }

      res.json({ success: true, message: 'Tag removida com sucesso' });
    } catch (error) {
      logger.error('Erro ao remover tag:', error);
      next(error);
    }
  }

  // ========== SEGURANÇA ==========

  /**
   * Resolver alerta de segurança
   */
  static async resolveSecurityAlert(req, res, next) {
    try {
      const { id, alertId } = req.params;
      const db = require('../config/database');

      const result = await db.query(`
        UPDATE security_alerts 
        SET is_resolved = true, resolved_by = $1, resolved_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id, alert_type, is_resolved, resolved_at
      `, [req.user.id, alertId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Alerta não encontrado' });
      }

      res.json({ success: true, message: 'Alerta resolvido', data: result.rows[0] });
    } catch (error) {
      logger.error('Erro ao resolver alerta:', error);
      next(error);
    }
  }

  /**
   * Reset de senha do usuário
   */
  static async resetUserPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const db = require('../config/database');

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const result = await db.query(
        `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username`,
        [hashedPassword, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      await AuditLog.create({
        adminId: req.user.id,
        action: 'RESET_PASSWORD',
        resourceType: 'user',
        resourceId: id,
        details: { username: result.rows[0].username },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info(`Admin ${req.user.email} resetou senha do usuário ${id}`);

      res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      logger.error('Erro ao resetar senha:', error);
      next(error);
    }
  }

  /**
   * Exportar dados do usuário em JSON (para CSV/PDF no frontend)
   */
  static async exportUserData(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;
      const db = require('../config/database');

      // Buscar todos os dados
      const [userResult, txResult, sessionResult] = await Promise.all([
        db.query(`SELECT id, email, username, first_name, last_name, balance, role, is_active, 
                         created_at, last_login_at, last_login_ip FROM users WHERE id = $1`, [id]),
        db.query(`SELECT type, amount, status, description, created_at FROM transactions 
                  WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
        db.query(`SELECT gs.start_time, gs.end_time, gs.total_bet, gs.total_win, g.name as game_name
                  FROM game_sessions gs LEFT JOIN games g ON gs.game_id = g.id
                  WHERE gs.user_id = $1 ORDER BY gs.start_time DESC`, [id])
      ]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
        user: userResult.rows[0],
        transactions: txResult.rows,
        gameSessions: sessionResult.rows
      };

      if (format === 'csv') {
        // Gerar CSV das transações
        const header = 'Tipo,Valor,Status,Descrição,Data\n';
        const csvRows = txResult.rows.map(r => 
          `${r.type},${r.amount},${r.status},"${(r.description || '').replace(/"/g, '""')}",${r.created_at}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=user_${id}_transactions.csv`);
        return res.send(header + csvRows);
      }

      await AuditLog.create({
        adminId: req.user.id,
        action: 'EXPORT_USER_DATA',
        resourceType: 'user',
        resourceId: id,
        details: { format },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({ success: true, data: exportData });
    } catch (error) {
      logger.error('Erro ao exportar dados:', error);
      next(error);
    }
  }
}

module.exports = AdminController;
