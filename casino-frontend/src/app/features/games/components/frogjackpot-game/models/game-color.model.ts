/**
 * Interface que representa uma ficha/chip do jogo FrogJackpot
 */
export interface GameColor {
  /** Identificador único da ficha */
  id: number;
  /** Nome da ficha para acessibilidade */
  name: string;
  /** URL da imagem da ficha */
  image: string;
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
