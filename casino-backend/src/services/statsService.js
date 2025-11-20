const db = require('../config/database');

class StatsService {
  /**
   * Obter estatísticas gerais do cassino
   */
  static async getCasinoStats(period = 'today') {
    try {
      const stats = {};

      // Definir período
      let dateCondition = '';
      const now = new Date();
      
      if (period === 'today') {
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        dateCondition = `WHERE created_at >= '${todayStart.toISOString()}'`;
      } else if (period === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateCondition = `WHERE created_at >= '${monthStart.toISOString()}'`;
      } else if (period === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateCondition = `WHERE created_at >= '${yearStart.toISOString()}'`;
      }

      // Total de usuários
      const usersQuery = 'SELECT COUNT(*) as total FROM users WHERE role = $1';
      const usersResult = await db.query(usersQuery, ['player']);
      stats.totalUsers = parseInt(usersResult.rows[0].total);

      // Usuários ativos (com transações no período)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as total 
        FROM transactions 
        ${dateCondition}
      `;
      const activeUsersResult = await db.query(activeUsersQuery);
      stats.activeUsers = parseInt(activeUsersResult.rows[0].total);

      // Total apostado
      const betsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        ${dateCondition} AND type = 'bet'
      `;
      const betsResult = await db.query(betsQuery);
      stats.totalBets = parseFloat(betsResult.rows[0].total);

      // Total pago em prêmios
      const winsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        ${dateCondition} AND type = 'win'
      `;
      const winsResult = await db.query(winsQuery);
      stats.totalWins = parseFloat(winsResult.rows[0].total);

      // Total de depósitos
      const depositsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        ${dateCondition} AND type = 'deposit'
      `;
      const depositsResult = await db.query(depositsQuery);
      stats.totalDeposits = parseFloat(depositsResult.rows[0].total);

      // Total de saques
      const withdrawalsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        ${dateCondition} AND type = 'withdrawal'
      `;
      const withdrawalsResult = await db.query(withdrawalsQuery);
      stats.totalWithdrawals = parseFloat(withdrawalsResult.rows[0].total);

      // Lucro do cassino
      stats.profit = stats.totalBets - stats.totalWins;

      // Saldo total do cassino (soma de todos os saldos dos usuários)
      const balanceQuery = 'SELECT COALESCE(SUM(balance), 0) as total FROM users';
      const balanceResult = await db.query(balanceQuery);
      stats.casinoBalance = parseFloat(balanceResult.rows[0].total);

      // Número de apostas
      const betsCountQuery = `
        SELECT COUNT(*) as total 
        FROM transactions 
        ${dateCondition} AND type = 'bet'
      `;
      const betsCountResult = await db.query(betsCountQuery);
      stats.betsCount = parseInt(betsCountResult.rows[0].total);

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter estatísticas por jogo
   */
  static async getGameStats(gameId = null, period = 'all') {
    try {
      let dateCondition = '';
      const now = new Date();
      
      if (period === 'today') {
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        dateCondition = `AND t.created_at >= '${todayStart.toISOString()}'`;
      } else if (period === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateCondition = `AND t.created_at >= '${monthStart.toISOString()}'`;
      }

      let gameCondition = '';
      const params = [];
      
      if (gameId) {
        gameCondition = 'AND t.game_id = $1';
        params.push(gameId);
      }

      const query = `
        SELECT 
          g.id,
          g.name,
          g.type,
          g.rtp,
          COUNT(CASE WHEN t.type = 'bet' THEN 1 END) as total_bets,
          COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins,
          COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END) - 
                   SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as profit,
          CASE 
            WHEN COUNT(CASE WHEN t.type = 'bet' THEN 1 END) > 0 
            THEN (COUNT(CASE WHEN t.type = 'win' THEN 1 END)::float / 
                  COUNT(CASE WHEN t.type = 'bet' THEN 1 END)::float * 100)
            ELSE 0 
          END as win_rate
        FROM games g
        LEFT JOIN transactions t ON g.id = t.game_id ${dateCondition}
        WHERE 1=1 ${gameCondition}
        GROUP BY g.id, g.name, g.type, g.rtp
        ORDER BY total_wagered DESC
      `;

      const result = await db.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        rtp: parseFloat(row.rtp),
        totalBets: parseInt(row.total_bets),
        totalWagered: parseFloat(row.total_wagered),
        totalWins: parseFloat(row.total_wins),
        profit: parseFloat(row.profit),
        winRate: parseFloat(row.win_rate).toFixed(2)
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter transações recentes
   */
  static async getRecentTransactions(limit = 10) {
    try {
      const query = `
        SELECT 
          t.*,
          u.username,
          u.email,
          g.name as game_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN games g ON t.game_id = g.id
        ORDER BY t.created_at DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter estatísticas de crescimento (comparação com período anterior)
   */
  static async getGrowthStats() {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      // Usuários novos hoje vs ontem
      const newUsersToday = await db.query(
        `SELECT COUNT(*) as total FROM users WHERE created_at >= $1`,
        [todayStart]
      );

      const newUsersYesterday = await db.query(
        `SELECT COUNT(*) as total FROM users 
         WHERE created_at >= $1 AND created_at < $2`,
        [yesterdayStart, todayStart]
      );

      // Apostas hoje vs ontem
      const betsToday = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
         WHERE type = 'bet' AND created_at >= $1`,
        [todayStart]
      );

      const betsYesterday = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
         WHERE type = 'bet' AND created_at >= $1 AND created_at < $2`,
        [yesterdayStart, todayStart]
      );

      const calculateGrowth = (today, yesterday) => {
        if (yesterday === 0) return today > 0 ? 100 : 0;
        return ((today - yesterday) / yesterday * 100).toFixed(2);
      };

      return {
        newUsers: {
          today: parseInt(newUsersToday.rows[0].total),
          yesterday: parseInt(newUsersYesterday.rows[0].total),
          growth: calculateGrowth(
            parseInt(newUsersToday.rows[0].total),
            parseInt(newUsersYesterday.rows[0].total)
          )
        },
        bets: {
          today: parseFloat(betsToday.rows[0].total),
          yesterday: parseFloat(betsYesterday.rows[0].total),
          growth: calculateGrowth(
            parseFloat(betsToday.rows[0].total),
            parseFloat(betsYesterday.rows[0].total)
          )
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = StatsService;
