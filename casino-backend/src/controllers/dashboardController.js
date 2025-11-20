const pool = require('../config/database');
const logger = require('../utils/logger');

class DashboardController {
  /**
   * Obter estatísticas do dashboard do usuário
   */
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      // Buscar estatísticas do usuário
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN type = 'bet' THEN id END) as total_games_played,
          COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_winnings,
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_bets
        FROM transactions
        WHERE user_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // Buscar jogo favorito (mais jogado)
      const favoriteGameQuery = `
        SELECT g.name, COUNT(*) as play_count
        FROM transactions t
        INNER JOIN games g ON t.game_id = g.id
        WHERE t.user_id = $1 AND t.type = 'bet'
        GROUP BY g.id, g.name
        ORDER BY play_count DESC
        LIMIT 1
      `;

      const favoriteGameResult = await pool.query(favoriteGameQuery, [userId]);
      const favoriteGame = favoriteGameResult.rows[0]?.name || 'Nenhum';

      // Calcular taxa de vitória
      const winRateQuery = `
        SELECT 
          COUNT(CASE WHEN type = 'bet' THEN 1 END) as total_bets,
          COUNT(CASE WHEN type = 'win' THEN 1 END) as total_wins
        FROM transactions
        WHERE user_id = $1
      `;

      const winRateResult = await pool.query(winRateQuery, [userId]);
      const { total_bets, total_wins } = winRateResult.rows[0];
      const winRate = total_bets > 0 ? (total_wins / total_bets) * 100 : 0;

      // Calcular sequência atual (wins consecutivos nos últimos jogos)
      const streakQuery = `
        SELECT type
        FROM transactions
        WHERE user_id = $1 AND (type = 'bet' OR type = 'win')
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const streakResult = await pool.query(streakQuery, [userId]);
      let currentStreak = 0;
      
      for (const row of streakResult.rows) {
        if (row.type === 'win') {
          currentStreak++;
        } else {
          break;
        }
      }

      const dashboardStats = {
        totalGamesPlayed: parseInt(stats.total_games_played) || 0,
        totalWinnings: parseFloat(stats.total_winnings) || 0,
        totalDeposits: parseFloat(stats.total_deposits) || 0,
        totalBets: parseFloat(stats.total_bets) || 0,
        favoriteGame,
        winRate: parseFloat(winRate.toFixed(2)),
        currentStreak,
      };

      logger.info(`Dashboard stats loaded for user ${userId}`);

      res.json({
        success: true,
        data: dashboardStats,
      });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas do usuário',
        error: error.message,
      });
    }
  }

  /**
   * Obter jogos recentes do usuário
   */
  static async getRecentGames(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;

      const query = `
        SELECT 
          g.id,
          g.name,
          g.type,
          t.amount as bet_amount,
          COALESCE(w.amount, 0) as win_amount,
          t.created_at as played_at,
          CASE 
            WHEN w.amount IS NOT NULL AND w.amount > 0 THEN true 
            ELSE false 
          END as won
        FROM transactions t
        INNER JOIN games g ON t.game_id = g.id
        LEFT JOIN transactions w ON w.user_id = t.user_id 
          AND w.game_id = t.game_id 
          AND w.type = 'win'
          AND w.created_at > t.created_at
          AND w.created_at < t.created_at + INTERVAL '1 minute'
        WHERE t.user_id = $1 AND t.type = 'bet'
        ORDER BY t.created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);

      const recentGames = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        betAmount: parseFloat(row.bet_amount),
        winAmount: parseFloat(row.win_amount),
        playedAt: row.played_at,
        won: row.won,
        profit: parseFloat(row.win_amount) - parseFloat(row.bet_amount),
      }));

      logger.info(`Recent games loaded for user ${userId}`);

      res.json({
        success: true,
        data: recentGames,
      });
    } catch (error) {
      logger.error('Error getting recent games:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar jogos recentes',
        error: error.message,
      });
    }
  }
}

module.exports = DashboardController;
