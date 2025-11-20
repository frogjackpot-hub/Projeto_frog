const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Bonus {
  constructor(data) {
    this.id = data.id;
    this.code = data.code;
    this.type = data.type; // 'deposit', 'no_deposit', 'cashback', 'free_spins'
    this.value = data.value;
    this.minDeposit = data.min_deposit;
    this.maxBonus = data.max_bonus;
    this.wagerRequirement = data.wager_requirement;
    this.expiresAt = data.expires_at;
    this.maxUses = data.max_uses;
    this.usedCount = data.used_count;
    this.isActive = data.is_active;
    this.description = data.description;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Criar novo bônus
   */
  static async create(bonusData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO bonuses (
          id, code, type, value, min_deposit, max_bonus,
          wager_requirement, expires_at, max_uses, is_active, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        id,
        bonusData.code.toUpperCase(),
        bonusData.type,
        bonusData.value,
        bonusData.minDeposit || 0,
        bonusData.maxBonus || null,
        bonusData.wagerRequirement || 1,
        bonusData.expiresAt || null,
        bonusData.maxUses || null,
        bonusData.isActive !== false,
        bonusData.description || ''
      ];

      const result = await db.query(query, values);
      return new Bonus(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar todos os bônus
   */
  static async findAll(includeInactive = false) {
    try {
      let query = 'SELECT * FROM bonuses';
      
      if (!includeInactive) {
        query += ' WHERE is_active = true';
      }
      
      query += ' ORDER BY created_at DESC';

      const result = await db.query(query);
      return result.rows.map(row => new Bonus(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar bônus por ID
   */
  static async findById(id) {
    try {
      const query = 'SELECT * FROM bonuses WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Bonus(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar bônus por código
   */
  static async findByCode(code) {
    try {
      const query = `
        SELECT * FROM bonuses 
        WHERE UPPER(code) = UPPER($1) AND is_active = true
      `;
      const result = await db.query(query, [code]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const bonus = new Bonus(result.rows[0]);

      // Verificar se expirou
      if (bonus.expiresAt && new Date(bonus.expiresAt) < new Date()) {
        return null;
      }

      // Verificar se atingiu o limite de usos
      if (bonus.maxUses && bonus.usedCount >= bonus.maxUses) {
        return null;
      }

      return bonus;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar bônus
   */
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.code !== undefined) {
        fields.push(`code = $${paramCount}`);
        values.push(updateData.code.toUpperCase());
        paramCount++;
      }

      if (updateData.type !== undefined) {
        fields.push(`type = $${paramCount}`);
        values.push(updateData.type);
        paramCount++;
      }

      if (updateData.value !== undefined) {
        fields.push(`value = $${paramCount}`);
        values.push(updateData.value);
        paramCount++;
      }

      if (updateData.minDeposit !== undefined) {
        fields.push(`min_deposit = $${paramCount}`);
        values.push(updateData.minDeposit);
        paramCount++;
      }

      if (updateData.maxBonus !== undefined) {
        fields.push(`max_bonus = $${paramCount}`);
        values.push(updateData.maxBonus);
        paramCount++;
      }

      if (updateData.wagerRequirement !== undefined) {
        fields.push(`wager_requirement = $${paramCount}`);
        values.push(updateData.wagerRequirement);
        paramCount++;
      }

      if (updateData.expiresAt !== undefined) {
        fields.push(`expires_at = $${paramCount}`);
        values.push(updateData.expiresAt);
        paramCount++;
      }

      if (updateData.maxUses !== undefined) {
        fields.push(`max_uses = $${paramCount}`);
        values.push(updateData.maxUses);
        paramCount++;
      }

      if (updateData.isActive !== undefined) {
        fields.push(`is_active = $${paramCount}`);
        values.push(updateData.isActive);
        paramCount++;
      }

      if (updateData.description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(updateData.description);
        paramCount++;
      }

      fields.push(`updated_at = NOW()`);

      values.push(id);
      const query = `
        UPDATE bonuses 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Bonus(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrementar contador de usos
   */
  static async incrementUsage(id) {
    try {
      const query = `
        UPDATE bonuses 
        SET used_count = used_count + 1
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Bonus(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletar bônus
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM bonuses WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Bonus(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Bonus;
