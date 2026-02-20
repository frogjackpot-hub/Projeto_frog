const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const RNGService = require('../services/rngService');
const db = require('../config/database');
const logger = require('../utils/logger');

class GameController {
  static async getGames(req, res, next) {
    try {
      const { type } = req.query;
      
      let games;
      if (type) {
        games = await Game.findByType(type);
      } else {
        games = await Game.findAll();
      }

      res.json({
        success: true,
        data: {
          games,
          count: games.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGame(req, res, next) {
    try {
      const { id } = req.params;

      // Validação básica de UUID para evitar passar valores literais como ':id' ao Postgres
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID do jogo inválido',
          code: 'INVALID_GAME_ID',
        });
      }

      const game = await Game.findById(id);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Jogo não encontrado',
          code: 'GAME_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: { game },
      });
    } catch (error) {
      next(error);
    }
  }

  static async playSlot(req, res, next) {
    try {
      const { gameId, amount } = req.body;
      // Validar gameId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId)) {
        return res.status(400).json({
          success: false,
          error: 'ID do jogo inválido',
          code: 'INVALID_GAME_ID',
        });
      }
      const user = req.user;

      // Verificar se o jogo existe
      const game = await Game.findById(gameId);
      if (!game || game.type !== 'slot') {
        return res.status(404).json({
          success: false,
          error: 'Jogo de slot não encontrado',
          code: 'SLOT_GAME_NOT_FOUND',
        });
      }

      // Verificar limites de aposta
      if (amount < game.minBet || amount > game.maxBet) {
        return res.status(400).json({
          success: false,
          error: `Aposta deve estar entre ${game.minBet} e ${game.maxBet}`,
          code: 'INVALID_BET_AMOUNT',
        });
      }

      // Verificar saldo
      if (user.balance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      // Criar transação de aposta
      const betTransaction = await Transaction.create({
        userId: user.id,
        type: 'bet',
        amount: amount,
        description: `Aposta no jogo ${game.name}`,
        gameId: gameId,
      });

      // Debitar valor da aposta
      await user.updateBalance(amount, 'subtract');

      // Jogar slot
      const result = RNGService.slotMachine();
      const winAmount = result.isWin ? amount * result.multiplier : 0;

      // Se ganhou, criar transação de vitória e creditar
      if (winAmount > 0) {
        const winTransaction = await Transaction.create({
          userId: user.id,
          type: 'win',
          amount: winAmount,
          description: `Vitória no jogo ${game.name}`,
          gameId: gameId,
        });

        await user.updateBalance(winAmount, 'add');
        await winTransaction.updateStatus('completed');
      }

      // Completar transação de aposta
      await betTransaction.updateStatus('completed');

      logger.info('Jogo de slot jogado', {
        userId: user.id,
        gameId: gameId,
        betAmount: amount,
        winAmount: winAmount,
        result: result.reels,
      });

      res.json({
        success: true,
        data: {
          result: result.reels,
          isWin: result.isWin,
          winAmount: winAmount,
          multiplier: result.multiplier,
          newBalance: user.balance,
          betTransaction: betTransaction.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async playRoulette(req, res, next) {
    try {
      const { gameId, amount, bet } = req.body;
      // Validar gameId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId)) {
        return res.status(400).json({
          success: false,
          error: 'ID do jogo inválido',
          code: 'INVALID_GAME_ID',
        });
      }
      const user = req.user;

      // Verificar se o jogo existe
      const game = await Game.findById(gameId);
      if (!game || game.type !== 'roulette') {
        return res.status(404).json({
          success: false,
          error: 'Jogo de roleta não encontrado',
          code: 'ROULETTE_GAME_NOT_FOUND',
        });
      }

      // Verificar limites de aposta
      if (amount < game.minBet || amount > game.maxBet) {
        return res.status(400).json({
          success: false,
          error: `Aposta deve estar entre ${game.minBet} e ${game.maxBet}`,
          code: 'INVALID_BET_AMOUNT',
        });
      }

      // Verificar saldo
      if (user.balance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      // Validar tipo de aposta
      const validBets = ['red', 'black', 'even', 'odd', 'low', 'high'];
      const numberBets = Array.from({length: 37}, (_, i) => i.toString());
      
      if (!validBets.includes(bet) && !numberBets.includes(bet)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de aposta inválido',
          code: 'INVALID_BET_TYPE',
        });
      }

      // Criar transação de aposta
      const betTransaction = await Transaction.create({
        userId: user.id,
        type: 'bet',
        amount: amount,
        description: `Aposta na roleta: ${bet}`,
        gameId: gameId,
      });

      // Debitar valor da aposta
      await user.updateBalance(amount, 'subtract');

      // Jogar roleta
      const result = RNGService.roulette();
      let isWin = false;
      let multiplier = 0;

      // Verificar se ganhou
      if (bet === 'red' && result.isRed) {
        isWin = true;
        multiplier = 2;
      } else if (bet === 'black' && result.isBlack) {
        isWin = true;
        multiplier = 2;
      } else if (bet === 'even' && result.isEven) {
        isWin = true;
        multiplier = 2;
      } else if (bet === 'odd' && result.isOdd) {
        isWin = true;
        multiplier = 2;
      } else if (bet === 'low' && result.isLow) {
        isWin = true;
        multiplier = 2;
      } else if (bet === 'high' && result.isHigh) {
        isWin = true;
        multiplier = 2;
      } else if (bet === result.number.toString()) {
        isWin = true;
        multiplier = 36; // Aposta em número específico
      }

      const winAmount = isWin ? amount * multiplier : 0;

      // Se ganhou, criar transação de vitória e creditar
      if (winAmount > 0) {
        const winTransaction = await Transaction.create({
          userId: user.id,
          type: 'win',
          amount: winAmount,
          description: `Vitória na roleta: ${bet}`,
          gameId: gameId,
        });

        await user.updateBalance(winAmount, 'add');
        await winTransaction.updateStatus('completed');
      }

      // Completar transação de aposta
      await betTransaction.updateStatus('completed');

      logger.info('Jogo de roleta jogado', {
        userId: user.id,
        gameId: gameId,
        betAmount: amount,
        betType: bet,
        result: result.number,
        winAmount: winAmount,
      });

      res.json({
        success: true,
        data: {
          result: result,
          bet: bet,
          isWin: isWin,
          winAmount: winAmount,
          multiplier: multiplier,
          newBalance: user.balance,
          betTransaction: betTransaction.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Jogar FrogJackpot - Jogo de escolha de cores
   * O jogador seleciona 6 cores (por índice), o sistema sorteia 6 cores aleatórias.
   * O prêmio é baseado na quantidade de acertos posicionais.
   * 
   * TODA A LÓGICA FINANCEIRA ACONTECE NO SERVIDOR para segurança.
   */
  static async playFrogjackpot(req, res, next) {
    const client = await db.pool.connect();
    
    try {
      const { gameId, amount, selectedColors } = req.body;
      const user = req.user;

      // ===== VALIDAÇÕES =====
      
      // Validar gameId (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(gameId)) {
        return res.status(400).json({
          success: false,
          error: 'ID do jogo inválido',
          code: 'INVALID_GAME_ID',
        });
      }

      // Validar selectedColors
      if (!Array.isArray(selectedColors) || selectedColors.length !== 6) {
        return res.status(400).json({
          success: false,
          error: 'Você deve selecionar exatamente 6 cores',
          code: 'INVALID_SELECTIONS',
        });
      }

      // Validar que todos os índices são números inteiros entre 0 e 11
      const validIndices = selectedColors.every(
        idx => Number.isInteger(idx) && idx >= 0 && idx <= 11
      );
      if (!validIndices) {
        return res.status(400).json({
          success: false,
          error: 'Índices de cores inválidos (devem ser inteiros de 0 a 11)',
          code: 'INVALID_COLOR_INDICES',
        });
      }

      // Validar valor da aposta
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        return res.status(400).json({
          success: false,
          error: 'Valor da aposta deve ser um número positivo',
          code: 'INVALID_BET_AMOUNT',
        });
      }

      // Verificar se o jogo existe e é do tipo frogjackpot
      const game = await Game.findById(gameId);
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Jogo FrogJackpot não encontrado',
          code: 'GAME_NOT_FOUND',
        });
      }

      // Verificar limites de aposta
      if (amount < game.minBet || amount > game.maxBet) {
        return res.status(400).json({
          success: false,
          error: `Aposta deve estar entre R$ ${game.minBet} e R$ ${game.maxBet}`,
          code: 'BET_OUT_OF_RANGE',
        });
      }

      // ===== INÍCIO DA TRANSAÇÃO ATÔMICA =====
      // Usamos transação do Postgres para garantir consistência do saldo
      await client.query('BEGIN');

      // Buscar saldo atualizado COM LOCK para evitar race conditions
      const balanceResult = await client.query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [user.id]
      );

      if (balanceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      const currentBalance = parseFloat(balanceResult.rows[0].balance);

      // Verificar saldo suficiente (com lock já adquirido)
      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      // Debitar aposta do saldo
      const newBalanceAfterBet = parseFloat((currentBalance - amount).toFixed(2));
      await client.query(
        'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalanceAfterBet, user.id]
      );

      // Registrar transação de aposta
      const betTxId = require('uuid').v4();
      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, status, description, game_id, created_at, updated_at)
         VALUES ($1, $2, 'bet', $3, 'completed', $4, $5, NOW(), NOW())`,
        [betTxId, user.id, amount, `Aposta FrogJackpot`, gameId]
      );

      // ===== SORTEIO E CÁLCULO (server-side) =====
      const systemColors = RNGService.frogjackpot(12, 6);
      const result = RNGService.frogjackpotResult(selectedColors, systemColors, amount);

      let finalBalance = newBalanceAfterBet;

      // Se ganhou, creditar prêmio
      if (result.winAmount > 0) {
        finalBalance = parseFloat((newBalanceAfterBet + result.winAmount).toFixed(2));
        
        await client.query(
          'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
          [finalBalance, user.id]
        );

        // Registrar transação de ganho
        const winTxId = require('uuid').v4();
        await client.query(
          `INSERT INTO transactions (id, user_id, type, amount, status, description, game_id, created_at, updated_at)
           VALUES ($1, $2, 'win', $3, 'completed', $4, $5, NOW(), NOW())`,
          [winTxId, user.id, result.winAmount, `Vitória FrogJackpot (${result.matchCount} acertos, x${result.multiplier})`, gameId]
        );
      }

      // Commit da transação
      await client.query('COMMIT');

      // Atualizar balance no objeto user para o log
      user.balance = finalBalance;

      logger.info('FrogJackpot jogado', {
        userId: user.id,
        gameId: gameId,
        betAmount: amount,
        selectedColors: selectedColors,
        systemColors: systemColors,
        matchCount: result.matchCount,
        multiplier: result.multiplier,
        winAmount: result.winAmount,
        isJackpot: result.isJackpot,
        newBalance: finalBalance,
      });

      res.json({
        success: true,
        data: {
          systemColors: result.systemColors,
          matchPositions: result.matchPositions,
          matchCount: result.matchCount,
          multiplier: result.multiplier,
          winAmount: result.winAmount,
          isJackpot: result.isJackpot,
          betAmount: amount,
          newBalance: finalBalance,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erro no FrogJackpot', { 
        error: error.message,
        userId: req.user?.id 
      });
      next(error);
    } finally {
      client.release();
    }
  }
}

module.exports = GameController;