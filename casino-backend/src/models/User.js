const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.password = data.password;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.balance = data.balance || 0;
    this.role = data.role || 'player';
    this.isActive = data.is_active === true || data.is_active === 1;
    this.isVerified = data.is_verified || false;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(userData) {
    const { email, username, password, firstName, lastName } = userData;
    
    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const id = uuidv4();
    
    const query = `
      INSERT INTO users (id, email, username, password, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [id, email, username, hashedPassword, firstName, lastName];
    
    try {
      const result = await db.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      // Mapear violação de constraint única do Postgres para erro amigável
      if (error && error.code === '23505') {
        // error.detail normalmente contém algo como: Key (email)=(x) already exists.
        const detail = error.detail || '';
        let appError;

        if (detail.includes('(email)') || (error.constraint && error.constraint.includes('email'))) {
          appError = new Error('Email já está em uso');
          appError.code = 'DUPLICATE_EMAIL';
        } else if (detail.includes('(username)') || (error.constraint && error.constraint.includes('username'))) {
          appError = new Error('Username já está em uso');
          appError.code = 'DUPLICATE_USERNAME';
        } else {
          appError = new Error('Entrada duplicada');
          appError.code = 'DUPLICATE_ENTRY';
        }

        appError.statusCode = 409;
        throw appError;
      }

      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [email]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmailIncludingInactive(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    
    try {
      const result = await db.query(query, [email]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [username]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  async validatePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  async updateBalance(amount, operation = 'add') {
    const newBalance = operation === 'add' 
      ? parseFloat(this.balance) + parseFloat(amount)
      : parseFloat(this.balance) - parseFloat(amount);
    
    if (newBalance < 0) {
      throw new Error('Saldo insuficiente');
    }
    
    const query = `
      UPDATE users 
      SET balance = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING balance
    `;
    
    try {
      const result = await db.query(query, [newBalance, this.id]);
      this.balance = result.rows[0].balance;
      return this.balance;
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    
    try {
      const result = await db.query(query);
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw error;
    }
  }

  static async findByIdWithInactive(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = ['first_name', 'last_name', 'email', 'username'];
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(updates[key]);
        valueIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async updateBalance(id, amount, description = '') {
    const query = `
      UPDATE users 
      SET balance = balance + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [amount, id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async toggleStatus(id) {
    const query = `
      UPDATE users 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;