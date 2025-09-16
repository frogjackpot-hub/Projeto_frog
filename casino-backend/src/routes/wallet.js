const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');
const { validate } = require('../middleware/validation');

// Schema para transações financeiras
const transactionSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Valor deve ser positivo',
    'any.required': 'Valor é obrigatório',
  }),
});

// Obter saldo (requer autenticação)
router.get('/balance', authenticateToken, WalletController.getBalance);

// Obter histórico de transações (requer autenticação)
router.get('/transactions', authenticateToken, WalletController.getTransactions);

// Fazer depósito (requer autenticação)
router.post('/deposit', authenticateToken, validate(transactionSchema), WalletController.deposit);

// Fazer saque (requer autenticação)
router.post('/withdraw', authenticateToken, validate(transactionSchema), WalletController.withdraw);

module.exports = router;