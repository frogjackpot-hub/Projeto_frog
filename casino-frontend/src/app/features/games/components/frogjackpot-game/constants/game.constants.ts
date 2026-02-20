import { GameColor, PrizeConfig } from '../models';

/**
 * Configurações do jogo FrogJackpot
 */
export const GAME_CONFIG = {
  /** Número máximo de cores que o jogador pode selecionar */
  MAX_SELECTIONS: 6,
  /** Número total de cores disponíveis */
  TOTAL_COLORS: 12,
  /** Aposta mínima permitida */
  MIN_BET: 1,
  /** Aposta máxima permitida */
  MAX_BET: 10000,
  /** Incremento padrão da aposta */
  BET_INCREMENT_SMALL: 10,
  /** Incremento grande da aposta (acima de 100) */
  BET_INCREMENT_LARGE: 50,
  /** Limite para usar incremento grande */
  BET_INCREMENT_THRESHOLD: 100,
  /** Delay entre revelações de cores do sistema (ms) */
  REVEAL_DELAY_MS: 300
} as const;

/**
 * Valores de apostas rápidas
 */
export const QUICK_BET_VALUES: readonly number[] = [10, 25, 50, 100, 500] as const;

/**
 * Tabela de prêmios APENAS para exibição na UI.
 * Os multiplicadores reais são calculados exclusivamente no servidor.
 * Qualquer alteração aqui afeta SOMENTE a exibição visual.
 */
export const PRIZE_TABLE: readonly PrizeConfig[] = [
  { matches: 6, multiplier: 50, description: 'JACKPOT!' },
  { matches: 5, multiplier: 20, description: '5 acertos' },
  { matches: 4, multiplier: 10, description: '4 acertos' },
  { matches: 3, multiplier: 5, description: '3 acertos' },
  { matches: 2, multiplier: 2, description: '2 acertos' },
  { matches: 1, multiplier: 1, description: '1 acerto' }
] as const;

/**
 * Paleta de cores disponíveis no jogo
 */
export const AVAILABLE_COLORS: readonly GameColor[] = [
  { id: 0, name: 'Vermelho', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  { id: 1, name: 'Azul', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
  { id: 2, name: 'Roxo', gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
  { id: 3, name: 'Ciano', gradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)' },
  { id: 4, name: 'Verde Limão', gradient: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)' },
  { id: 5, name: 'Rosa', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
  { id: 6, name: 'Laranja', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' },
  { id: 7, name: 'Azul Claro', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)' },
  { id: 8, name: 'Turquesa', gradient: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)' },
  { id: 9, name: 'Azul Marinho', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
  { id: 10, name: 'Amarelo', gradient: 'linear-gradient(135deg, #fde047 0%, #facc15 100%)' },
  { id: 11, name: 'Magenta', gradient: 'linear-gradient(135deg, #e879f9 0%, #d946ef 100%)' }
] as const;

/**
 * Ícones usados no jogo
 */
export const GAME_ICONS = {
  FROG: '🐸',
  MONEY: '💰',
  TARGET: '🎯',
  ROBOT: '🤖',
  REFRESH: '🔄',
  TROPHY: '🏆',
  CELEBRATION: '🎉',
  SPARKLE: '✨',
  CHECK: '✓'
} as const;

/**
 * Mensagens do jogo
 */
export const GAME_MESSAGES = {
  SELECT_COLORS: 'Selecione 6 cores para jogar!',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente!',
  MIN_BET_ERROR: 'Aposta mínima é R$ 1!',
  JACKPOT: 'JACKPOT! 🏆',
  HOW_TO_PLAY: 'Selecione 6 cores na ordem que você acha que o sistema vai sortear. Quanto mais cores você acertar na posição correta, maior seu prêmio! 🏆'
} as const;
