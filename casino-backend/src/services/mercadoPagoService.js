const crypto = require('crypto');
const util = require('util');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const logger = require('../utils/logger');

class MercadoPagoService {
  constructor() {
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    this.webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    this.statementDescriptor = (process.env.MERCADO_PAGO_STATEMENT_DESCRIPTOR || 'FROGJACKPOT').slice(0, 22);
    this.testPayerEmail = process.env.MERCADO_PAGO_TEST_PAYER_EMAIL;

    if (!this.accessToken) {
      logger.warn('MercadoPago: MERCADO_PAGO_ACCESS_TOKEN nao configurado');
      this.client = null;
      this.paymentApi = null;
      return;
    }

    this.client = new MercadoPagoConfig({
      accessToken: this.accessToken,
      options: {
        timeout: 10000,
      },
    });
    this.paymentApi = new Payment(this.client);
  }

  isConfigured() {
    return !!this.paymentApi;
  }

  async createPixPayment({ transactionId, amount, user, notificationUrl }) {
    if (!this.paymentApi) {
      throw new Error('Mercado Pago nao configurado');
    }

    const safeAmount = Number.parseFloat(Number(amount).toFixed(2));
    const isTestToken = String(this.accessToken || '').startsWith('TEST-');
    const payerEmail = isTestToken && this.testPayerEmail ? this.testPayerEmail : user.email;

    if (isTestToken && (!this.testPayerEmail || this.testPayerEmail.includes('test_user_123456@testuser.com'))) {
      const appError = new Error('Defina MERCADO_PAGO_TEST_PAYER_EMAIL com o email real de COMPRADOR de teste do Mercado Pago para usar token TEST.');
      appError.statusCode = 400;
      appError.code = 'MERCADO_PAGO_TEST_PAYER_EMAIL_REQUIRED';
      throw appError;
    }

    const payload = {
      body: {
        transaction_amount: safeAmount,
        description: `Deposito PIX - ${user.username || user.email}`,
        payment_method_id: 'pix',
        external_reference: transactionId,
        notification_url: notificationUrl,
        payer: {
          email: payerEmail,
        },
        metadata: {
          user_id: user.id,
          username: user.username,
          transaction_id: transactionId,
          platform: 'frogjackpot',
        },
      },
    };

    try {
      const result = await this.paymentApi.create(payload);
      const txData = result?.point_of_interaction?.transaction_data || {};

      return {
        mercadoPagoPaymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        qrCode: txData.qr_code || null,
        qrCodeBase64: txData.qr_code_base64 || null,
        ticketUrl: txData.ticket_url || null,
        expirationDate: result.date_of_expiration || null,
        raw: result,
      };
    } catch (error) {
      const causes = error?.cause || error?.response?.data?.cause || error?.error || [];
      const rawMessage =
        error?.message
        || error?.response?.data?.message
        || (typeof error === 'string' ? error : null)
        || null;
      const causeText = Array.isArray(causes)
        ? causes
          .map((c) => {
            if (typeof c === 'string') return c;
            return `${c?.code || 'unknown'}: ${c?.description || c?.message || JSON.stringify(c)}`;
          })
          .filter(Boolean)
          .join(' | ')
        : (typeof causes === 'string' ? causes : rawMessage);
      const safeMessage = causeText || rawMessage || 'Erro de comunicacao com Mercado Pago';

      logger.warn('MercadoPago: falha ao criar pagamento PIX', {
        message: rawMessage,
        causes,
        inspected: util.inspect(error, { depth: 4 }),
      });

      const appError = new Error(`Falha ao criar pagamento PIX no Mercado Pago: ${safeMessage}`);
      appError.statusCode = 400;
      appError.code = 'MERCADO_PAGO_PIX_CREATE_FAILED';
      appError.details = {
        message: error?.message,
        status: error?.status || error?.response?.status,
        causes,
      };
      throw appError;
    }
  }

  async getPaymentById(paymentId) {
    if (!this.paymentApi) {
      throw new Error('Mercado Pago nao configurado');
    }

    return this.paymentApi.get({ id: paymentId });
  }

  mapProviderStatus(providerStatus) {
    switch (providerStatus) {
      case 'approved':
        return 'completed';
      case 'pending':
      case 'in_process':
        return 'pending';
      case 'cancelled':
        return 'cancelled';
      case 'rejected':
      case 'refunded':
      case 'charged_back':
        return 'failed';
      default:
        return 'pending';
    }
  }

  verifyWebhookSignature(req, paymentId) {
    if (!this.webhookSecret) {
      return true;
    }

    const signatureHeader = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];

    if (!signatureHeader || !requestId || !paymentId) {
      return false;
    }

    const signatureParts = String(signatureHeader)
      .split(',')
      .map((part) => part.trim())
      .reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

    const ts = signatureParts.ts;
    const v1 = signatureParts.v1;

    if (!ts || !v1) {
      return false;
    }

    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    return hash === v1;
  }
}

module.exports = new MercadoPagoService();
