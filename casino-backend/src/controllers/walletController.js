const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

class WalletController {
  static async getBalance(req, res, next) {
    try {
      const user = req.user;

      res.json({
        success: true,
        data: {
          balance: user.balance,
          userId: user.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req, res, next) {
    try {
      const user = req.user;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;
      const transactions = await Transaction.findByUserId(user.id, parseInt(limit), offset);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: transactions.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deposit(req, res, next) {
    try {
      const { amount } = req.body;
      const user = req.user;

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valor do depósito deve ser positivo',
          code: 'INVALID_DEPOSIT_AMOUNT',
        });
      }

      // Criar transação de depósito
      const transaction = await Transaction.create({
        userId: user.id,
        type: 'deposit',
        amount: amount,
        description: 'Depósito na carteira',
      });

      // Creditar valor na carteira
      await user.updateBalance(amount, 'add');
      await transaction.updateStatus('completed');

      logger.info('Depósito realizado', {
        userId: user.id,
        amount: amount,
        transactionId: transaction.id,
      });

      res.json({
        success: true,
        message: 'Depósito realizado com sucesso',
        data: {
          transaction: transaction,
          newBalance: user.balance,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async withdraw(req, res, next) {
    try {
      const { amount } = req.body;
      const user = req.user;

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valor do saque deve ser positivo',
          code: 'INVALID_WITHDRAWAL_AMOUNT',
        });
      }

      if (user.balance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      // Criar transação de saque
      const transaction = await Transaction.create({
        userId: user.id,
        type: 'withdrawal',
        amount: amount,
        description: 'Saque da carteira',
      });

      // Debitar valor da carteira
      await user.updateBalance(amount, 'subtract');
      await transaction.updateStatus('completed');

      logger.info('Saque realizado', {
        userId: user.id,
        amount: amount,
        transactionId: transaction.id,
      });

      res.json({
        success: true,
        message: 'Saque realizado com sucesso',
        data: {
          transaction: transaction,
          newBalance: user.balance,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;