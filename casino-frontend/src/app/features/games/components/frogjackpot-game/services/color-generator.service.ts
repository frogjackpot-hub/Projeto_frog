import { Injectable } from '@angular/core';
import { AVAILABLE_COLORS } from '../constants';
import { GameColor } from '../models';

/**
 * Service responsável por mapear cores do jogo.
 * 
 * IMPORTANTE: O sorteio de cores é feito exclusivamente no servidor.
 * Este service apenas converte índices em objetos de cor para exibição.
 */
@Injectable({
  providedIn: 'root'
})
export class ColorGeneratorService {

  /**
   * Converte índices de cores para objetos GameColor
   * @param indices Array de índices
   * @returns Array de GameColor
   */
  indicesToColors(indices: number[]): GameColor[] {
    return indices.map(index => ({ ...AVAILABLE_COLORS[index] }));
  }

  /**
   * Obtém uma cor pelo seu índice
   * @param index Índice da cor
   * @returns GameColor ou null se índice inválido
   */
  getColorByIndex(index: number): GameColor | null {
    if (index < 0 || index >= AVAILABLE_COLORS.length) {
      return null;
    }
    return { ...AVAILABLE_COLORS[index] };
  }

  /**
   * Obtém todas as cores disponíveis
   * @returns Array de todas as GameColor disponíveis
   */
  getAllColors(): GameColor[] {
    return AVAILABLE_COLORS.map(color => ({ ...color }));
  }

  /**
   * Verifica se um índice de cor é válido
   * @param index Índice a verificar
   * @returns true se válido
   */
  isValidColorIndex(index: number): boolean {
    return index >= 0 && index < AVAILABLE_COLORS.length;
  }
}
