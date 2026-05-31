const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Transaction {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.type = data.type; // 'deposit', 'withdrawal', 'bet', 'win'
    this.amount = data.amount;
    this.status = data.status; // 'pending', 'completed', 'failed', 'cancelled'
    this.description = data.description;
    this.gameId = data.game_id;
    this.paymentProvider = data.payment_provider;
    this.paymentMethod = data.payment_method;
    this.externalReference = data.external_reference;
    this.providerPaymentId = data.provider_payment_id;
    this.providerStatus = data.provider_status;
    this.providerMetadata = data.provider_metadata;
    this.webhookPayload = data.webhook_payload;
    this.approvedAt = data.approved_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(transactionData) {
    const {
      userId,
      type,
      amount,
      description,
      gameId,
      paymentProvider,
      paymentMethod,
      externalReference,
      providerPaymentId,
      providerStatus,
      providerMetadata,
    } = transactionData;
    
    const id = uuidv4();
    
    const query = `
      INSERT INTO transactions (
        id, user_id, type, amount, status, description, game_id,
        payment_provider, payment_method, external_reference,
        provider_payment_id, provider_status, provider_metadata,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      id,
      userId,
      type,
      amount,
      description,
      gameId,
      paymentProvider || null,
      paymentMethod || null,
      externalReference || id,
      providerPaymentId || null,
      providerStatus || null,
      providerMetadata || null,
    ];
    
    try {
      const result = await db.query(query, values);
      return new Transaction(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await db.query(query, [userId, limit, offset]);
      return result.rows.map(row => new Transaction(row));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM transactions WHERE id = $1 LIMIT 1';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? new Transaction(result.rows[0]) : null;
  }

  static async findByIdAndUser(id, userId) {
    const query = 'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 LIMIT 1';
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0 ? new Transaction(result.rows[0]) : null;
  }

  static async findByProviderPaymentId(providerPaymentId) {
    const query = 'SELECT * FROM transactions WHERE provider_payment_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query, [String(providerPaymentId)]);
    return result.rows.length > 0 ? new Transaction(result.rows[0]) : null;
  }

  async updateStatus(status) {
    const query = `
      UPDATE transactions 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    
    try {
      const result = await db.query(query, [status, this.id]);
      this.status = result.rows[0].status;
      this.updatedAt = result.rows[0].updated_at;
      return this;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Transaction;