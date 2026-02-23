const AuthService = require('../services/authService');
const logger = require('../utils/logger');
const db = require('../config/database');

// Parser simples de User-Agent
function parseUserAgent(ua) {
  const result = { deviceType: 'desktop', browser: 'Desconhecido', os: 'Desconhecido' };
  if (!ua) return result;

  // Device type
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    result.deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Browser
  if (/edg\//i.test(ua)) result.browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) result.browser = 'Opera';
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) result.browser = 'Chrome';
  else if (/firefox/i.test(ua)) result.browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) result.browser = 'Safari';

  // OS
  if (/windows/i.test(ua)) result.os = 'Windows';
  else if (/mac os/i.test(ua)) result.os = 'macOS';
  else if (/linux/i.test(ua)) result.os = 'Linux';
  else if (/android/i.test(ua)) result.os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) result.os = 'iOS';

  return result;
}

class AuthController {
  static async register(req, res, next) {
    try {
      // Log dos dados recebidos (sem senha)
      logger.info('Tentativa de registro', {
        body: {
          ...req.body,
          password: '***'
        }
      });

      const result = await AuthService.register(req.body);
      
      logger.info('Novo usuário registrado', {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
      });

      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: result,
      });
    } catch (error) {
      logger.error('Erro no registro', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || '';
      
      let loginUserId = null;
      let loginSuccess = false;

      try {
        const result = await AuthService.login(email, password);
        loginUserId = result.user.id;
        loginSuccess = true;

        // Atualizar last_login_at, last_login_ip e total_login_count
        try {
          await db.query(`
            UPDATE users 
            SET last_login_at = NOW(), 
                last_login_ip = $1, 
                total_login_count = COALESCE(total_login_count, 0) + 1
            WHERE id = $2
          `, [ipAddress, result.user.id]);
        } catch (e) {
          logger.warn('Erro ao atualizar dados de login do usuário:', e.message);
        }

        // Registrar no histórico de login
        try {
          const parsedUA = parseUserAgent(userAgent);
          await db.query(`
            INSERT INTO login_history (id, user_id, ip_address, user_agent, device_type, browser, os, success)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)
          `, [result.user.id, ipAddress, userAgent, parsedUA.deviceType, parsedUA.browser, parsedUA.os]);
        } catch (e) {
          logger.warn('Erro ao registrar histórico de login:', e.message);
        }

        logger.info('Usuário logado', {
          userId: result.user.id,
          email: result.user.email,
        });

        res.json({
          success: true,
          message: 'Login realizado com sucesso',
          data: result,
        });
      } catch (error) {
        // Registrar tentativa de login falhada
        if (email) {
          try {
            const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
            if (userResult.rows.length > 0) {
              const failedUserId = userResult.rows[0].id;
              const parsedUA = parseUserAgent(userAgent);
              await db.query(`
                INSERT INTO login_history (id, user_id, ip_address, user_agent, device_type, browser, os, success)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false)
              `, [failedUserId, ipAddress, userAgent, parsedUA.deviceType, parsedUA.browser, parsedUA.os]);
            }
          } catch (e) {
            logger.warn('Erro ao registrar login falhado:', e.message);
          }
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  static async profile(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user.toJSON(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      // Em uma implementação mais robusta, você invalidaria o token aqui
      // Por exemplo, adicionando-o a uma blacklist no Redis
      
      logger.info('Usuário deslogado', {
        userId: req.user.id,
        email: req.user.email,
      });

      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;