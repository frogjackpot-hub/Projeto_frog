const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Registro de usuário
router.post('/register', validate(schemas.register), AuthController.register);

// Login
router.post('/login', validate(schemas.login), AuthController.login);

// Perfil do usuário (requer autenticação)
router.get('/profile', authenticateToken, AuthController.profile);

// Logout (requer autenticação)
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;