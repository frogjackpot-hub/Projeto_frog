const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

class AuthService {
  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  static async register(userData) {
    const { email, username } = userData;

    // Verificar se email já existe
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      const error = new Error('Email já está em uso');
      error.code = 'DUPLICATE_EMAIL';
      error.statusCode = 409;
      throw error;
    }

    // Verificar se username já existe
    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      const error = new Error('Username já está em uso');
      error.code = 'DUPLICATE_USERNAME';
      error.statusCode = 409;
      throw error;
    }

    // Criar usuário
    const user = await User.create(userData);
    const tokens = this.generateTokens(user);

    return {
      user: user.toJSON(),
      tokens,
    };
  }

  static async login(email, password) {
    // Buscar usuário incluindo inativos para poder diferenciar
    // "credenciais inválidas" de "conta bloqueada"
    const user = await User.findByEmailIncludingInactive(email);
    
    if (!user) {
      const error = new Error('Credenciais inválidas');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    // Verificar se o usuário está bloqueado ANTES de validar a senha
    if (!user.isActive) {
      const error = new Error('Sua conta foi bloqueada. Entre em contato com o suporte.');
      error.code = 'USER_BLOCKED';
      error.statusCode = 403;
      throw error;
    }

    const isPasswordValid = await user.validatePassword(password);
    
    if (!isPasswordValid) {
      const error = new Error('Credenciais inválidas');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      throw error;
    }

    const tokens = this.generateTokens(user);

    return {
      user: user.toJSON(),
      tokens,
    };
  }
}

module.exports = AuthService;