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

// Rota raiz do grupo /api/auth — evita 404 para requisições GET simples
router.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Rotas de autenticação disponíveis',
		endpoints: {
			register: '/api/auth/register (POST)',
			login: '/api/auth/login (POST)',
			profile: '/api/auth/profile (GET) - requer Authorization: Bearer <token>',
			logout: '/api/auth/logout (POST) - requer Authorization: Bearer <token>'
		}
	});
});

module.exports = router;