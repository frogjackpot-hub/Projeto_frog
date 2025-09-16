const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const RNGService = require('../services/rngService');
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
}

module.exports = GameController;