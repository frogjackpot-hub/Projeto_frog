const db = require('../config/database');

class CasinoConfig {
  constructor(data) {
    this.id = data.id;
    this.key = data.key;
    this.value = data.value;
    this.description = data.description;
    this.updatedAt = data.updated_at;
  }

  /**
   * Buscar configuração por chave
   */
  static async findByKey(key) {
    try {
      const query = 'SELECT * FROM casino_config WHERE key = $1';
      const result = await db.query(query, [key]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new CasinoConfig(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar todas as configurações
   */
  static async findAll() {
    try {
      const query = 'SELECT * FROM casino_config ORDER BY key';
      const result = await db.query(query);
      return result.rows.map(row => new CasinoConfig(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar ou criar configuração
   */
  static async upsert(key, value, description = '') {
    try {
      const query = `
        INSERT INTO casino_config (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, description = $3, updated_at = NOW()
        RETURNING *
      `;

      const result = await db.query(query, [key, JSON.stringify(value), description]);
      return new CasinoConfig(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar múltiplas configurações
   */
  static async updateMany(configs) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      const results = [];
      for (const config of configs) {
        const query = `
          INSERT INTO casino_config (key, value, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) 
          DO UPDATE SET value = $2, description = $3, updated_at = NOW()
          RETURNING *
        `;

        const result = await client.query(query, [
          config.key,
          JSON.stringify(config.value),
          config.description || ''
        ]);
        results.push(new CasinoConfig(result.rows[0]));
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deletar configuração
   */
  static async delete(key) {
    try {
      const query = 'DELETE FROM casino_config WHERE key = $1 RETURNING *';
      const result = await db.query(query, [key]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new CasinoConfig(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CasinoConfig;
