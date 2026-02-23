const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Não logar token (não existe) — apenas contexto
    const logger = require('../utils/logger');
    logger.warn('Tentativa de acesso sem token', { url: req.url, method: req.method, ip: req.ip });
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByIdWithInactive(decoded.userId);
    
    if (!user) {
      const logger = require('../utils/logger');
      // Logar apenas parte do token para diagnóstico (não vazar o token completo)
      const tokenHint = token.length > 10 ? `...${token.slice(-6)}` : token;
      logger.warn('Token válido mas usuário não encontrado', { url: req.url, method: req.method, ip: req.ip, tokenHint });
      return res.status(401).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se o usuário está ativo (não bloqueado)
    // Exceção: permitir que admins acessem /admin/users/:id/toggle-status mesmo bloqueados
    const isToggleStatusRoute = req.url.includes('/toggle-status');
    if (!user.isActive && !isToggleStatusRoute) {
      const logger = require('../utils/logger');
      const tokenHint = token.length > 10 ? `...${token.slice(-6)}` : token;
      logger.warn('Tentativa de acesso com usuário bloqueado', { 
        url: req.url, 
        method: req.method, 
        ip: req.ip, 
        userId: user.id,
        tokenHint 
      });
      return res.status(403).json({ 
        error: 'Sua conta foi bloqueada. Entre em contato com o suporte.',
        code: 'USER_BLOCKED'
      });
    }

    req.user = user;

    // Atualizar last_activity_at para rastrear status online (fire-and-forget)
    try {
      const db = require('../config/database');
      db.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [user.id]).catch(() => {});
    } catch (_) {}

    next();
  } catch (error) {
    const logger = require('../utils/logger');
    const tokenHint = token && token.length > 10 ? `...${token.slice(-6)}` : token;

    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expirado', { url: req.url, method: req.method, ip: req.ip, tokenHint });
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    logger.warn('Token inválido', { url: req.url, method: req.method, ip: req.ip, tokenHint, error: error.message });
    return res.status(403).json({ 
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Permissões insuficientes.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware específico para proteger rotas de administrador
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuário não autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'admin') {
    const logger = require('../utils/logger');
    logger.warn(`Tentativa de acesso admin negada para usuário: ${req.user.id}`);
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores.',
      code: 'ADMIN_ONLY'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
};