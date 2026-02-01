import { Injectable } from '@angular/core';
import { GAME_CONFIG, PRIZE_MULTIPLIERS } from '../constants';
import { GameColor, GameResult } from '../models';

/**
 * Service responsável por calcular prêmios e resultados do jogo
 */
@Injectable({
  providedIn: 'root'
})
export class PrizeCalculatorService {

  /**
   * Calcula o resultado completo de uma rodada
   * @param playerColors Cores selecionadas pelo jogador
   * @param systemColors Cores sorteadas pelo sistema
   * @param betAmount Valor apostado
   * @returns GameResult com todos os dados do resultado
   */
  calculateResult(
    playerColors: GameColor[],
    systemColors: GameColor[],
    betAmount: number
  ): GameResult {
    const matchPositions = this.calculateMatchPositions(playerColors, systemColors);
    const matchCount = matchPositions.filter(match => match).length;
    const multiplier = this.getMultiplier(matchCount);
    const winAmount = this.calculateWinAmount(betAmount, multiplier);

    return {
      playerColors,
      systemColors,
      matches: matchCount,
      multiplier,
      betAmount,
      winAmount,
      matchPositions,
      isJackpot: matchCount === GAME_CONFIG.MAX_SELECTIONS
    };
  }

  /**
   * Calcula quais posições foram acertos
   * @param playerColors Cores do jogador
   * @param systemColors Cores do sistema
   * @returns Array de boolean indicando acertos por posição
   */
  calculateMatchPositions(
    playerColors: (GameColor | null)[],
    systemColors: (GameColor | null)[]
  ): boolean[] {
    const positions: boolean[] = [];
    
    for (let i = 0; i < GAME_CONFIG.MAX_SELECTIONS; i++) {
      const playerColor = playerColors[i];
      const systemColor = systemColors[i];
      
      positions.push(
        playerColor !== null && 
        systemColor !== null && 
        playerColor.id === systemColor.id
      );
    }
    
    return positions;
  }

  /**
   * Conta o número de acertos
   * @param playerColors Cores do jogador
   * @param systemColors Cores do sistema
   * @returns Número de acertos
   */
  countMatches(
    playerColors: (GameColor | null)[],
    systemColors: (GameColor | null)[]
  ): number {
    return this.calculateMatchPositions(playerColors, systemColors)
      .filter(match => match).length;
  }

  /**
   * Obtém o multiplicador baseado no número de acertos
   * @param matchCount Número de acertos
   * @returns Multiplicador do prêmio
   */
  getMultiplier(matchCount: number): number {
    return PRIZE_MULTIPLIERS[matchCount] ?? 0;
  }

  /**
   * Calcula o valor do prêmio
   * @param betAmount Valor apostado
   * @param multiplier Multiplicador
   * @returns Valor do prêmio
   */
  calculateWinAmount(betAmount: number, multiplier: number): number {
    return betAmount * multiplier;
  }

  /**
   * Verifica se determinada posição é um acerto
   * @param position Posição a verificar (0-5)
   * @param playerColors Cores do jogador
   * @param systemColors Cores do sistema
   * @returns true se for acerto
   */
  isMatchAtPosition(
    position: number,
    playerColors: (GameColor | null)[],
    systemColors: (GameColor | null)[]
  ): boolean {
    const playerColor = playerColors[position];
    const systemColor = systemColors[position];
    
    return playerColor !== null && 
           systemColor !== null && 
           playerColor.id === systemColor.id;
  }

  /**
   * Determina o ícone de resultado baseado nos acertos
   * @param matchCount Número de acertos
   * @returns Emoji apropriado
   */
  getResultIcon(matchCount: number): string {
    if (matchCount >= 4) return '🎉';
    if (matchCount >= 2) return '✨';
    return '🐸';
  }

  /**
   * Determina a mensagem de resultado
   * @param matchCount Número de acertos
   * @returns Mensagem formatada
   */
  getResultMessage(matchCount: number): string {
    if (matchCount === 6) return 'JACKPOT! 🏆';
    return `${matchCount} acerto(s)!`;
  }
}
