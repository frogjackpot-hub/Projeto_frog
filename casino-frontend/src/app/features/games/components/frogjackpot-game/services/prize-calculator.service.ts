import { Injectable } from '@angular/core';
import { GAME_CONFIG } from '../constants';
import { GameColor } from '../models';

/**
 * Service auxiliar para verificações VISUAIS de acertos no jogo.
 * 
 * IMPORTANTE: Nenhum cálculo financeiro (multiplicadores, prêmios, saldo)
 * é feito aqui. Toda lógica financeira é processada exclusivamente no servidor.
 * Este service existe apenas para ajudar a UI a exibir informações visuais.
 */
@Injectable({
  providedIn: 'root'
})
export class PrizeCalculatorService {

  /**
   * Verifica se determinada posição é um acerto (comparação visual)
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
   * Determina o ícone de resultado baseado nos acertos (visual)
   * @param matchCount Número de acertos
   * @returns Emoji apropriado
   */
  getResultIcon(matchCount: number): string {
    if (matchCount >= 4) return '🎉';
    if (matchCount >= 2) return '✨';
    return '🐸';
  }

  /**
   * Determina a mensagem de resultado (visual)
   * @param matchCount Número de acertos
   * @returns Mensagem formatada
   */
  getResultMessage(matchCount: number): string {
    if (matchCount === GAME_CONFIG.MAX_SELECTIONS) return 'JACKPOT! 🏆';
    return `${matchCount} acerto(s)!`;
  }
}
