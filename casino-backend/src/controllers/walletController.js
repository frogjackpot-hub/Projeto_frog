const Transaction = require('../models/Transaction');
const HouseBalanceService = require('../services/houseBalanceService');
const MercadoPagoService = require('../services/mercadoPagoService');
const TelegramService = require('../services/telegramService');
const db = require('../config/database');
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
    return WalletController.createPixDeposit(req, res, next);
  }

  static async createPixDeposit(req, res, next) {
    try {
      const { amount } = req.body;
      const user = req.user;

      if (!MercadoPagoService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Gateway de pagamento indisponivel',
          code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        });
      }

      if (amount < 1 || amount > 100) {
        return res.status(400).json({
          success: false,
          error: 'Valor do deposito deve estar entre R$ 1,00 e R$ 100,00',
          code: 'INVALID_DEPOSIT_AMOUNT',
        });
      }

      const transaction = await Transaction.create({
        userId: user.id,
        type: 'deposit',
        amount: amount,
        description: 'Deposito PIX pendente',
        paymentProvider: 'mercado_pago',
        paymentMethod: 'pix',
      });

      const backendBaseUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
      const notificationUrl = `${backendBaseUrl}/api/wallet/mercadopago/webhook`;

      const payment = await MercadoPagoService.createPixPayment({
        transactionId: transaction.id,
        amount,
        user,
        notificationUrl,
      });

      await db.query(
        `
          UPDATE transactions
          SET
            provider_payment_id = $1,
            provider_status = $2,
            provider_metadata = $3,
            external_reference = $4,
            updated_at = NOW()
          WHERE id = $5
        `,
        [
          payment.mercadoPagoPaymentId,
          payment.status,
          JSON.stringify({
            statusDetail: payment.statusDetail,
            expirationDate: payment.expirationDate,
            ticketUrl: payment.ticketUrl,
          }),
          transaction.id,
          transaction.id,
        ]
      );

      logger.info('Deposito PIX criado', {
        userId: user.id,
        amount: amount,
        transactionId: transaction.id,
        mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
      });

      res.json({
        success: true,
        message: 'Pagamento PIX criado com sucesso',
        data: {
          transactionId: transaction.id,
          amount: Number(amount),
          paymentMethod: 'pix',
          status: payment.status,
          providerPaymentId: payment.mercadoPagoPaymentId,
          qrCode: payment.qrCode,
          qrCodeBase64: payment.qrCodeBase64,
          ticketUrl: payment.ticketUrl,
          expiresAt: payment.expirationDate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPixDepositStatus(req, res, next) {
    try {
      const { transactionId } = req.params;
      const user = req.user;

      const transaction = await Transaction.findByIdAndUser(transactionId, user.id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transacao nao encontrada',
          code: 'TRANSACTION_NOT_FOUND',
        });
      }

      let userBalance = user.balance;
      if (transaction.status === 'completed') {
        const refreshedUser = await db.query('SELECT balance FROM users WHERE id = $1 LIMIT 1', [user.id]);
        userBalance = refreshedUser.rows[0]?.balance ?? user.balance;
      }

      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          status: transaction.status,
          amount: Number(transaction.amount),
          providerStatus: transaction.providerStatus,
          providerPaymentId: transaction.providerPaymentId,
          paymentMethod: transaction.paymentMethod,
          approvedAt: transaction.approvedAt,
          newBalance: Number(userBalance),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async mercadoPagoWebhook(req, res, next) {
    try {
      if (!MercadoPagoService.isConfigured()) {
        return res.status(200).json({ success: true, ignored: true, reason: 'gateway_not_configured' });
      }

      const paymentId =
        req.body?.data?.id
        || req.query?.['data.id']
        || req.query?.id
        || null;

      if (!paymentId) {
        return res.status(200).json({ success: true, ignored: true, reason: 'missing_payment_id' });
      }

      if (!MercadoPagoService.verifyWebhookSignature(req, String(paymentId))) {
        logger.warn('Webhook Mercado Pago rejeitado por assinatura invalida', {
          paymentId: String(paymentId),
          requestId: req.headers['x-request-id'],
        });
        return res.status(401).json({ success: false, error: 'invalid_signature' });
      }

      const payment = await MercadoPagoService.getPaymentById(String(paymentId));
      const externalReference = payment.external_reference;

      if (!externalReference) {
        logger.warn('Pagamento Mercado Pago sem external_reference', { paymentId: String(paymentId) });
        return res.status(200).json({ success: true, ignored: true, reason: 'missing_external_reference' });
      }

      const client = await db.pool.connect();
      let notifyTelegram = null;

      try {
        await client.query('BEGIN');

        const txResult = await client.query(
          `
            SELECT t.*, u.username, u.email
            FROM transactions t
            INNER JOIN users u ON u.id = t.user_id
            WHERE t.id = $1
            FOR UPDATE
          `,
          [externalReference]
        );

        if (txResult.rows.length === 0) {
          await client.query('ROLLBACK');
          logger.warn('Webhook Mercado Pago com transacao interna nao encontrada', {
            paymentId: String(paymentId),
            externalReference,
          });
          return res.status(200).json({ success: true, ignored: true, reason: 'transaction_not_found' });
        }

        const tx = txResult.rows[0];
        const mappedStatus = MercadoPagoService.mapProviderStatus(payment.status);
        const providerMetadata = {
          statusDetail: payment.status_detail,
          dateApproved: payment.date_approved,
          dateCreated: payment.date_created,
          dateLastUpdated: payment.date_last_updated,
          paymentTypeId: payment.payment_type_id,
          paymentMethodId: payment.payment_method_id,
          transactionData: payment.point_of_interaction?.transaction_data || null,
        };

        if (mappedStatus === 'completed' && tx.status !== 'completed') {
          const balanceResult = await client.query(
            `
              UPDATE users
              SET balance = balance + $1, updated_at = NOW()
              WHERE id = $2
              RETURNING balance
            `,
            [tx.amount, tx.user_id]
          );

          await client.query(
            `
              UPDATE transactions
              SET
                status = 'completed',
                payment_provider = 'mercado_pago',
                payment_method = 'pix',
                provider_payment_id = $1,
                provider_status = $2,
                provider_metadata = $3,
                webhook_payload = $4,
                approved_at = NOW(),
                description = $5,
                updated_at = NOW()
              WHERE id = $6
            `,
            [
              String(payment.id),
              payment.status,
              JSON.stringify(providerMetadata),
              JSON.stringify(req.body || {}),
              'Deposito PIX aprovado via Mercado Pago',
              tx.id,
            ]
          );

          notifyTelegram = {
            username: tx.username,
            email: tx.email,
            amount: Number(tx.amount),
            transactionId: tx.id,
            providerPaymentId: String(payment.id),
            method: 'PIX',
            newBalance: Number(balanceResult.rows[0]?.balance || 0),
          };
        } else {
          await client.query(
            `
              UPDATE transactions
              SET
                status = $1,
                payment_provider = 'mercado_pago',
                payment_method = 'pix',
                provider_payment_id = $2,
                provider_status = $3,
                provider_metadata = $4,
                webhook_payload = $5,
                description = $6,
                updated_at = NOW()
              WHERE id = $7
            `,
            [
              mappedStatus,
              String(payment.id),
              payment.status,
              JSON.stringify(providerMetadata),
              JSON.stringify(req.body || {}),
              `Deposito PIX ${payment.status}`,
              tx.id,
            ]
          );
        }

        await client.query('COMMIT');
      } catch (transactionError) {
        await client.query('ROLLBACK');
        throw transactionError;
      } finally {
        client.release();
      }

      if (notifyTelegram) {
        await TelegramService.notifyPaymentApproved(notifyTelegram);
      }

      return res.status(200).json({ success: true });
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

      // Saque efetivado reduz o caixa operacional da casa.
      await HouseBalanceService.adjustOperationalBalance(-parseFloat(amount));

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