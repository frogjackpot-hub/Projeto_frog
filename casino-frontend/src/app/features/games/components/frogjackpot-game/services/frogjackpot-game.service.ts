import { computed, Injectable, signal } from '@angular/core';
import { AVAILABLE_COLORS, GAME_CONFIG } from '../constants';
import { GameColor, GameResult, GameState, GameStatus, INITIAL_GAME_STATE } from '../models';
import { ColorGeneratorService } from './color-generator.service';
import { PrizeCalculatorService } from './prize-calculator.service';

/**
 * Service principal que gerencia todo o estado e lógica do jogo FrogJackpot
 * Utiliza Angular Signals para reatividade
 */
@Injectable({
  providedIn: 'root'
})
export class FrogjackpotGameService {
  // Estado do jogo usando signals
  private readonly _gameState = signal<GameState>({ ...INITIAL_GAME_STATE });
  
  // Signals computados (derivados)
  readonly gameState = this._gameState.asReadonly();
  
  readonly selectedColors = computed(() => this._gameState().selectedColorIndices);
  readonly playerSlots = computed(() => this._gameState().playerSlots);
  readonly systemSlots = computed(() => this._gameState().systemSlots);
  readonly betAmount = computed(() => this._gameState().betAmount);
  readonly balance = computed(() => this._gameState().balance);
  readonly matchCount = computed(() => this._gameState().matchCount);
  readonly lastWin = computed(() => this._gameState().lastWin);
  readonly isPlaying = computed(() => this._gameState().isPlaying);
  readonly isFinished = computed(() => this._gameState().isFinished);
  readonly status = computed(() => this._gameState().status);
  
  readonly canPlay = computed(() => 
    this._gameState().selectedColorIndices.length === GAME_CONFIG.MAX_SELECTIONS &&
    this._gameState().betAmount <= this._gameState().balance &&
    !this._gameState().isPlaying
  );
  
  readonly selectionCount = computed(() => this._gameState().selectedColorIndices.length);
  readonly isSelectionComplete = computed(() => 
    this._gameState().selectedColorIndices.length === GAME_CONFIG.MAX_SELECTIONS
  );

  // Aliases para compatibilidade com o componente principal
  readonly selectedIndices = computed(() => this._gameState().selectedColorIndices);
  readonly currentBet = computed(() => this._gameState().betAmount);
  
  // Computed para retornar cores do jogador (não null)
  readonly playerChoices = computed(() => 
    this._gameState().playerSlots.filter((c): c is GameColor => c !== null)
  );
  
  // Computed para retornar cores do sistema
  readonly systemChoices = computed(() => this._gameState().systemSlots);
  
  // Estado do último resultado
  private _lastResult: GameResult | null = null;
  
  /** Retorna o último resultado da rodada */
  result(): GameResult | null {
    return this._lastResult;
  }

  constructor(
    private colorGenerator: ColorGeneratorService,
    private prizeCalculator: PrizeCalculatorService
  ) {}

  /**
   * Inicializa o jogo com saldo
   * @param initialBalance Saldo inicial (opcional)
   */
  initialize(initialBalance?: number): void {
    this._gameState.set({
      ...INITIAL_GAME_STATE,
      balance: initialBalance ?? GAME_CONFIG.INITIAL_BALANCE
    });
  }

  /**
   * Atualiza o saldo do jogador
   * @param balance Novo saldo
   */
  setBalance(balance: number): void {
    this._gameState.update(state => ({ ...state, balance }));
  }

  /**
   * Verifica se uma cor está selecionada
   * @param colorIndex Índice da cor
   * @returns true se selecionada
   */
  isColorSelected(colorIndex: number): boolean {
    return this._gameState().selectedColorIndices.includes(colorIndex);
  }

  /**
   * Obtém a ordem de seleção de uma cor (1-6)
   * @param colorIndex Índice da cor
   * @returns Ordem de seleção ou 0 se não selecionada
   */
  getSelectionOrder(colorIndex: number): number {
    const index = this._gameState().selectedColorIndices.indexOf(colorIndex);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Alterna a seleção de uma cor
   * @param colorIndex Índice da cor a alternar
   */
  toggleColorSelection(colorIndex: number): void {
    if (this._gameState().isPlaying) return;
    
    // Reset se jogo terminou
    if (this._gameState().isFinished) {
      this.resetRound();
    }

    const currentSelections = [...this._gameState().selectedColorIndices];
    const existingIndex = currentSelections.indexOf(colorIndex);

    if (existingIndex >= 0) {
      // Remover cor
      currentSelections.splice(existingIndex, 1);
    } else if (currentSelections.length < GAME_CONFIG.MAX_SELECTIONS) {
      // Adicionar cor
      currentSelections.push(colorIndex);
    }

    // Atualizar estado
    this._gameState.update(state => ({
      ...state,
      selectedColorIndices: currentSelections,
      playerSlots: this.buildPlayerSlots(currentSelections),
      status: currentSelections.length === GAME_CONFIG.MAX_SELECTIONS 
        ? GameStatus.SELECTING 
        : GameStatus.IDLE
    }));
  }

  /**
   * Constrói os slots do jogador a partir dos índices selecionados
   */
  private buildPlayerSlots(selectedIndices: number[]): (GameColor | null)[] {
    return Array(GAME_CONFIG.MAX_SELECTIONS).fill(null).map((_, i) => {
      if (i < selectedIndices.length) {
        return this.colorGenerator.getColorByIndex(selectedIndices[i]);
      }
      return null;
    });
  }

  /**
   * Limpa todas as seleções
   */
  clearSelections(): void {
    if (this._gameState().isPlaying) return;

    this._gameState.update(state => ({
      ...state,
      selectedColorIndices: [],
      playerSlots: [null, null, null, null, null, null],
      systemSlots: [null, null, null, null, null, null],
      matchCount: 0,
      lastWin: 0,
      isFinished: false,
      status: GameStatus.IDLE
    }));
  }

  /**
   * Reset apenas da rodada (mantém seleções)
   */
  private resetRound(): void {
    this._gameState.update(state => ({
      ...state,
      systemSlots: [null, null, null, null, null, null],
      matchCount: 0,
      lastWin: 0,
      isFinished: false,
      status: GameStatus.SELECTING
    }));
  }

  /**
   * Define o valor da aposta
   * @param amount Novo valor
   */
  setBetAmount(amount: number): void {
    const clampedAmount = Math.max(
      GAME_CONFIG.MIN_BET,
      Math.min(amount, this._gameState().balance)
    );
    
    this._gameState.update(state => ({
      ...state,
      betAmount: clampedAmount
    }));
  }

  /**
   * Aumenta a aposta
   */
  increaseBet(): void {
    const currentBet = this._gameState().betAmount;
    const increment = currentBet >= GAME_CONFIG.BET_INCREMENT_THRESHOLD 
      ? GAME_CONFIG.BET_INCREMENT_LARGE 
      : GAME_CONFIG.BET_INCREMENT_SMALL;
    
    this.setBetAmount(currentBet + increment);
  }

  /**
   * Diminui a aposta
   */
  decreaseBet(): void {
    const currentBet = this._gameState().betAmount;
    const decrement = currentBet > GAME_CONFIG.BET_INCREMENT_THRESHOLD 
      ? GAME_CONFIG.BET_INCREMENT_LARGE 
      : GAME_CONFIG.BET_INCREMENT_SMALL;
    
    this.setBetAmount(currentBet - decrement);
  }

  /**
   * Inicia uma rodada do jogo
   * @returns Promise que resolve quando a rodada termina
   */
  async playRound(): Promise<GameResult | null> {
    const state = this._gameState();
    
    // Validações
    if (state.selectedColorIndices.length < GAME_CONFIG.MAX_SELECTIONS) {
      return null;
    }
    
    if (state.betAmount > state.balance) {
      return null;
    }

    // Reset se necessário
    if (state.isFinished) {
      this.resetRound();
    }

    // Iniciar jogo
    this._gameState.update(s => ({
      ...s,
      isPlaying: true,
      isFinished: false,
      balance: s.balance - s.betAmount,
      status: GameStatus.PLAYING
    }));

    // Revelar cores do sistema com animação
    const systemColorIndices = await this.revealSystemColors();
    
    // Calcular resultado
    const result = this.calculateAndApplyResult(systemColorIndices);

    // Finalizar
    this._gameState.update(s => ({
      ...s,
      isPlaying: false,
      isFinished: true,
      status: GameStatus.FINISHED
    }));

    return result;
  }

  /**
   * Revela as cores do sistema com animação
   */
  private async revealSystemColors(): Promise<number[]> {
    const systemColorIndices = this.colorGenerator.generateRandomColorIndices();
    
    this._gameState.update(s => ({ ...s, status: GameStatus.REVEALING }));

    // Revelar uma cor por vez
    for (let i = 0; i < GAME_CONFIG.MAX_SELECTIONS; i++) {
      await this.delay(GAME_CONFIG.REVEAL_DELAY_MS);
      
      this._gameState.update(state => {
        const newSystemSlots = [...state.systemSlots];
        newSystemSlots[i] = this.colorGenerator.getColorByIndex(systemColorIndices[i]);
        return { ...state, systemSlots: newSystemSlots };
      });
    }

    return systemColorIndices;
  }

  /**
   * Calcula e aplica o resultado da rodada
   */
  private calculateAndApplyResult(systemColorIndices: number[]): GameResult {
    const state = this._gameState();
    const playerColors = state.playerSlots.filter((c): c is GameColor => c !== null);
    const systemColors = systemColorIndices.map(i => AVAILABLE_COLORS[i]);
    
    const result = this.prizeCalculator.calculateResult(
      playerColors,
      systemColors,
      state.betAmount
    );

    // Armazenar resultado
    this._lastResult = result;

    // Aplicar prêmio
    this._gameState.update(s => ({
      ...s,
      matchCount: result.matches,
      lastWin: result.winAmount,
      balance: s.balance + result.winAmount
    }));

    return result;
  }

  /**
   * Utilitário de delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se uma posição é um acerto
   */
  isMatchAtPosition(position: number): boolean {
    const state = this._gameState();
    return this.prizeCalculator.isMatchAtPosition(
      position,
      state.playerSlots,
      state.systemSlots
    );
  }

  /**
   * Define o valor da aposta (alias para setBetAmount)
   */
  setBet(amount: number): void {
    this.setBetAmount(amount);
  }

  /**
   * Reset completo do jogo
   */
  reset(): void {
    this._lastResult = null;
    this.clearSelections();
  }

  /**
   * Cleanup do serviço (chamado no ngOnDestroy)
   */
  cleanup(): void {
    this._lastResult = null;
    this._gameState.set({ ...INITIAL_GAME_STATE });
  }
}
