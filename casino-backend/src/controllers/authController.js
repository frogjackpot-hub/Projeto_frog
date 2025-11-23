const AuthService = require('../services/authService');
const logger = require('../utils/logger');

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
      const result = await AuthService.login(email, password);
      
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