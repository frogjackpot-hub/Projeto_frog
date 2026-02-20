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
 * Fichas coloridas disponíveis no jogo
 */
export const AVAILABLE_COLORS: readonly GameColor[] = [
  { id: 0, name: 'Vermelho', image: 'https://i.postimg.cc/Lhs486JX/Bright-Red-FF0000.png' },
  { id: 1, name: 'Vinho', image: 'https://i.postimg.cc/T5hT7QzN/Burgundy-800000.png' },
  { id: 2, name: 'Verde Escuro', image: 'https://i.postimg.cc/QKVj4S2f/Dark-Green-006400.png' },
  { id: 3, name: 'Ciano', image: 'https://i.postimg.cc/jnCRgvp8/Electric-Cyan-00FFFF.png' },
  { id: 4, name: 'Azul Claro', image: 'https://i.postimg.cc/T5hT7QzC/Electric-Cyan-00FFFF-(1).png' },
  { id: 5, name: 'Dourado', image: 'https://i.postimg.cc/gLrGSN9P/Golden-Yellow-FFD700.png' },
  { id: 6, name: 'Rosa', image: 'https://i.postimg.cc/p5yPGkw6/Hot-Pink-FF0088.png' },
  { id: 7, name: 'Branco', image: 'https://i.postimg.cc/q6gpbQPb/Ice-White-F5F5F5.png' },
  { id: 8, name: 'Roxo', image: 'https://i.postimg.cc/ct6d9Tpp/Intense-Purple-8000FF.png' },
  { id: 9, name: 'Verde Neon', image: 'https://i.postimg.cc/N2LQJpht/Neon-Green-00FF00.png' },
  { id: 10, name: 'Azul Royal', image: 'https://i.postimg.cc/H8jTZBGH/Royal-Blue-0047FF.png' },
  { id: 11, name: 'Laranja', image: 'https://i.postimg.cc/XBXnHxRt/Strong-Orange-FF5A00.png' }
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
  SELECT_COLORS: 'Selecione 6 fichas para jogar!',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente!',
  MIN_BET_ERROR: 'Aposta mínima é R$ 1!',
  JACKPOT: 'JACKPOT! 🏆',
  HOW_TO_PLAY: 'Selecione 6 fichas na ordem que você acha que o sistema vai sortear. Quanto mais fichas você acertar na posição correta, maior seu prêmio! 🏆'
} as const;
