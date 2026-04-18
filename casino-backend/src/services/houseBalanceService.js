const db = require('../config/database');

const HOUSE_BALANCE_KEY = 'house_operational_balance';
const DEFAULT_OPERATIONAL_BALANCE = 10000;
const DEFAULT_DESCRIPTION = 'Caixa operacional real da casa para cobertura de operações (não inclui passivo de saldo dos usuários)';

class HouseBalanceService {
  static parseConfigNumber(value, fallback = DEFAULT_OPERATIONAL_BALANCE) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.');
      const parsed = parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    if (value && typeof value === 'object') {
      if (typeof value.amount === 'number' && Number.isFinite(value.amount)) {
        return value.amount;
      }
      if (typeof value.value === 'number' && Number.isFinite(value.value)) {
        return value.value;
      }
    }

    return fallback;
  }

  static async ensureOperationalBalanceConfig(client = null) {
    const queryRunner = client ? client.query.bind(client) : db.query.bind(db);

    await queryRunner(
      `INSERT INTO casino_config (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING`,
      [HOUSE_BALANCE_KEY, JSON.stringify(DEFAULT_OPERATIONAL_BALANCE), DEFAULT_DESCRIPTION]
    );
  }

  static async getOperationalBalance(client = null) {
    const queryRunner = client ? client.query.bind(client) : db.query.bind(db);

    await this.ensureOperationalBalanceConfig(client);

    const result = await queryRunner(
      `SELECT value
       FROM casino_config
       WHERE key = $1
       LIMIT 1`,
      [HOUSE_BALANCE_KEY]
    );

    return this.parseConfigNumber(result.rows[0]?.value, DEFAULT_OPERATIONAL_BALANCE);
  }

  static async setOperationalBalance(newBalance, client = null) {
    const queryRunner = client ? client.query.bind(client) : db.query.bind(db);
    const normalizedBalance = parseFloat(newBalance.toFixed(2));

    await this.ensureOperationalBalanceConfig(client);

    await queryRunner(
      `UPDATE casino_config
       SET value = $1::jsonb,
           description = COALESCE(description, $2),
           updated_at = NOW()
       WHERE key = $3`,
      [JSON.stringify(normalizedBalance), DEFAULT_DESCRIPTION, HOUSE_BALANCE_KEY]
    );

    return normalizedBalance;
  }

  static async adjustOperationalBalance(delta, client = null) {
    const currentBalance = await this.getOperationalBalance(client);
    const normalizedDelta = parseFloat((delta || 0).toFixed(2));
    const newBalance = parseFloat((currentBalance + normalizedDelta).toFixed(2));

    await this.setOperationalBalance(newBalance, client);

    return {
      previousBalance: currentBalance,
      delta: normalizedDelta,
      newBalance
    };
  }
}

module.exports = HouseBalanceService;
