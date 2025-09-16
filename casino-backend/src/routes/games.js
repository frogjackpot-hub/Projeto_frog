const express = require('express');
const router = express.Router();
const GameController = require('../controllers/gameController');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Listar jogos disponíveis
router.get('/', GameController.getGames);

// Obter detalhes de um jogo específico
router.get('/:id', GameController.getGame);

// Jogar slot (requer autenticação)
router.post('/slot/play', authenticateToken, validate(schemas.bet), GameController.playSlot);

// Jogar roleta (requer autenticação)
router.post('/roulette/play', authenticateToken, GameController.playRoulette);

module.exports = router;