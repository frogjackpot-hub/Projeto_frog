import { GameColor } from './game-color.model';

/**
 * Interface para o resultado de uma rodada do jogo
 */
export interface GameResult {
  /** Cores selecionadas pelo jogador */
  playerColors: GameColor[];
  /** Cores sorteadas pelo sistema */
  systemColors: GameColor[];
  /** Quantidade de acertos na posição correta */
  matches: number;
  /** Multiplicador aplicado */
  multiplier: number;
  /** Valor apostado */
  betAmount: number;
  /** Valor ganho */
  winAmount: number;
  /** Array indicando quais posições foram acertos */
  matchPositions: boolean[];
  /** Flag indicando se foi jackpot (6 acertos) */
  isJackpot: boolean;
}

/**
 * Interface para configuração de prêmios
 */
export interface PrizeConfig {
  /** Quantidade de acertos */
  matches: number;
  /** Multiplicador do prêmio */
  multiplier: number;
  /** Descrição do prêmio */
  description: string;
}
