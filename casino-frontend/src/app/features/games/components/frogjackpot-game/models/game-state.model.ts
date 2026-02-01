import { GameColor } from './game-color.model';

/**
 * Estados possíveis do jogo
 */
export enum GameStatus {
  IDLE = 'idle',
  SELECTING = 'selecting',
  PLAYING = 'playing',
  REVEALING = 'revealing',
  FINISHED = 'finished'
}

/**
 * Interface que representa o estado atual do jogo
 */
export interface GameState {
  /** Status atual do jogo */
  status: GameStatus;
  /** Cores selecionadas pelo jogador (índices) */
  selectedColorIndices: number[];
  /** Slots do jogador com as cores */
  playerSlots: (GameColor | null)[];
  /** Slots do sistema com as cores sorteadas */
  systemSlots: (GameColor | null)[];
  /** Valor da aposta atual */
  betAmount: number;
  /** Saldo do jogador */
  balance: number;
  /** Quantidade de acertos */
  matchCount: number;
  /** Valor do último prêmio ganho */
  lastWin: number;
  /** Flag indicando se o jogo está em andamento */
  isPlaying: boolean;
  /** Flag indicando se o jogo terminou */
  isFinished: boolean;
}

/**
 * Estado inicial padrão do jogo
 */
export const INITIAL_GAME_STATE: GameState = {
  status: GameStatus.IDLE,
  selectedColorIndices: [],
  playerSlots: [null, null, null, null, null, null],
  systemSlots: [null, null, null, null, null, null],
  betAmount: 10,
  balance: 1000,
  matchCount: 0,
  lastWin: 0,
  isPlaying: false,
  isFinished: false
};
