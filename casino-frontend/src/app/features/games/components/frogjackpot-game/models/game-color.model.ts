/**
 * Interface que representa uma cor do jogo FrogJackpot
 */
export interface GameColor {
  /** Identificador único da cor */
  id: number;
  /** Nome da cor para acessibilidade */
  name: string;
  /** Gradiente CSS da cor */
  gradient: string;
}

/**
 * Interface para cor selecionada com informação de ordem
 */
export interface SelectedColor {
  /** Índice da cor no array de cores disponíveis */
  colorIndex: number;
  /** Ordem de seleção (1-6) */
  selectionOrder: number;
}
