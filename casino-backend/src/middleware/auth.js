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
    const user = await User.findById(decoded.userId);
    
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

    req.user = user;
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

module.exports = {
  authenticateToken,
  requireRole,
};