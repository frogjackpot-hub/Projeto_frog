import { Injectable } from '@angular/core';
import { AVAILABLE_COLORS, GAME_CONFIG } from '../constants';
import { GameColor } from '../models';

/**
 * Service responsável por gerar cores aleatórias para o sistema
 * Implementa o algoritmo de sorteio do FrogJackpot
 */
@Injectable({
  providedIn: 'root'
})
export class ColorGeneratorService {
  
  /**
   * Gera um array de índices de cores aleatórias sem repetição
   * @param count Quantidade de cores a gerar (padrão: 6)
   * @returns Array de índices únicos
   */
  generateRandomColorIndices(count: number = GAME_CONFIG.MAX_SELECTIONS): number[] {
    const indices: number[] = [];
    const available = [...Array(GAME_CONFIG.TOTAL_COLORS).keys()];

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      indices.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }

    return indices;
  }

  /**
   * Converte índices de cores para objetos GameColor
   * @param indices Array de índices
   * @returns Array de GameColor
   */
  indicesToColors(indices: number[]): GameColor[] {
    return indices.map(index => ({ ...AVAILABLE_COLORS[index] }));
  }

  /**
   * Gera cores aleatórias como objetos GameColor
   * @param count Quantidade de cores a gerar
   * @returns Array de GameColor
   */
  generateRandomColors(count: number = GAME_CONFIG.MAX_SELECTIONS): GameColor[] {
    const indices = this.generateRandomColorIndices(count);
    return this.indicesToColors(indices);
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
