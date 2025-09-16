const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Game {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type; // 'slot', 'blackjack', 'roulette', 'poker'
    this.minBet = data.min_bet;
    this.maxBet = data.max_bet;
    this.rtp = data.rtp; // Return to Player percentage
    this.isActive = data.is_active !== false;
    this.description = data.description;
    this.rules = data.rules;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async findAll() {
    const query = 'SELECT * FROM games WHERE is_active = true ORDER BY name';
    
    try {
      const result = await db.query(query);
      return result.rows.map(row => new Game(row));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM games WHERE id = $1 AND is_active = true';
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? new Game(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByType(type) {
    const query = 'SELECT * FROM games WHERE type = $1 AND is_active = true ORDER BY name';
    
    try {
      const result = await db.query(query, [type]);
      return result.rows.map(row => new Game(row));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Game;