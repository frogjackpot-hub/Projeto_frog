const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');
const { validateParamUUID } = require('../middleware/validateParams');
const Joi = require('joi');
const { validate } = require('../middleware/validation');

// Schema para transações financeiras
const transactionSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Valor deve ser positivo',
    'any.required': 'Valor é obrigatório',
  }),
});

const withdrawSchema = Joi.object({
  amount: Joi.number().precision(2).positive().required().messages({
    'number.positive': 'Valor deve ser positivo',
    'any.required': 'Valor e obrigatorio',
  }),
  pixKey: Joi.string().trim().min(4).max(140).required().messages({
    'string.min': 'Chave PIX invalida',
    'any.required': 'Chave PIX e obrigatoria',
  }),
  pixKeyType: Joi.string().valid('cpf', 'cnpj', 'email', 'phone', 'random').default('random'),
});

const pixDepositSchema = Joi.object({
  amount: Joi.number().precision(2).min(1).max(100).required().messages({
    'number.min': 'Valor minimo do deposito PIX e R$ 1,00',
    'number.max': 'Valor maximo do deposito PIX e R$ 100,00',
    'any.required': 'Valor e obrigatorio',
  }),
});

// Obter saldo (requer autenticação)
router.get('/balance', authenticateToken, WalletController.getBalance);

// Obter histórico de transações (requer autenticação)
router.get('/transactions', authenticateToken, WalletController.getTransactions);

// Fazer depósito (requer autenticação)
router.post('/deposit', authenticateToken, validate(transactionSchema), WalletController.deposit);

// Criar deposito PIX no Mercado Pago
router.post('/deposit/pix', authenticateToken, validate(pixDepositSchema), WalletController.createPixDeposit);

// Consultar status do deposito PIX
router.get('/deposit/:transactionId/status', authenticateToken, validateParamUUID('transactionId'), WalletController.getPixDepositStatus);

// Fazer saque (requer autenticação)
router.get('/withdraw/config', authenticateToken, WalletController.getWithdrawConfig);
router.post('/withdraw', authenticateToken, validate(withdrawSchema), WalletController.withdraw);

// Webhook Mercado Pago (nao autenticado)
router.post('/mercadopago/webhook', WalletController.mercadoPagoWebhook);
router.get('/mercadopago/webhook', (req, res) => {
  res.status(200).json({ success: true, message: 'Webhook Mercado Pago ativo' });
});

module.exports = router;