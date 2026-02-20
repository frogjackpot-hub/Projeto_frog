import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../core/services/api.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { AVAILABLE_COLORS, GAME_CONFIG } from '../constants';
import { GameColor, GameResult, GameState, GameStatus, INITIAL_GAME_STATE } from '../models';
import { ColorGeneratorService } from './color-generator.service';
import { PrizeCalculatorService } from './prize-calculator.service';

/** Resposta do endpoint POST /games/frogjackpot/play */
interface FrogjackpotPlayResponse {
  systemColors: number[];
  matchPositions: boolean[];
  matchCount: number;
  multiplier: number;
  winAmount: number;
  isJackpot: boolean;
  betAmount: number;
  newBalance: number;
}

/** ID fixo do jogo FrogJackpot no banco de dados */
const FROGJACKPOT_GAME_ID = 'd4e5f6a7-b8c9-4123-9efa-111111111111';

/**
 * Service principal que gerencia todo o estado e lógica do jogo FrogJackpot
 * Utiliza Angular Signals para reatividade
 * 
 * IMPORTANTE: Toda lógica financeira (débito, crédito, cálculo de prêmios)
 * é processada no servidor. O frontend apenas exibe os resultados.
 */
@Injectable({
  providedIn: 'root'
})
export class FrogjackpotGameService {
  // Estado do jogo usando signals
  private readonly _gameState = signal<GameState>({ ...INITIAL_GAME_STATE });
  
  // Signal para mensagem de erro
  private readonly _errorMessage = signal<string | null>(null);
  
  // Signals computados (derivados)
  readonly gameState = this._gameState.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  
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
    this._gameState().betAmount >= GAME_CONFIG.MIN_BET &&
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
    private prizeCalculator: PrizeCalculatorService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /**
   * Inicializa o jogo carregando o saldo real do usuário
   */
  initialize(): void {
    // Carregar saldo real do usuário autenticado
    const user = this.authService.currentUserValue;
    const realBalance = user?.balance ?? 0;

    this._gameState.set({
      ...INITIAL_GAME_STATE,
      balance: realBalance
    });
    this._errorMessage.set(null);

    // Forçar refresh dos dados do usuário para ter saldo atualizado
    this.authService.refreshUserData().subscribe({
      next: (updatedUser) => {
        if (updatedUser) {
          this._gameState.update(s => ({ ...s, balance: updatedUser.balance }));
        }
      },
      error: (err) => {
        console.error('Erro ao carregar saldo:', err);
      }
    });
  }

  /**
   * Atualiza o saldo do jogador (usado quando recebemos atualização do servidor)
   * @param balance Novo saldo
   */
  setBalance(balance: number): void {
    this._gameState.update(state => ({ ...state, balance }));
  }

  /**
   * Limpa mensagem de erro
   */
  clearError(): void {
    this._errorMessage.set(null);
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

    // Limpar erro ao interagir
    this._errorMessage.set(null);
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
    this._errorMessage.set(null);
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
   * Inicia uma rodada do jogo.
   * 
   * FLUXO:
   * 1. Validações locais rápidas
   * 2. Marca como "playing" e debita localmente para feedback imediato
   * 3. Envia aposta ao servidor (que faz o débito real + sorteio + cálculo)
   * 4. Anima a revelação das cores do sistema retornadas pelo servidor
   * 5. Atualiza saldo com o valor real retornado pelo servidor
   * 
   * @returns Promise que resolve quando a rodada termina
   */
  async playRound(): Promise<GameResult | null> {
    const state = this._gameState();
    
    // Validações locais
    if (state.selectedColorIndices.length < GAME_CONFIG.MAX_SELECTIONS) {
      this._errorMessage.set('Selecione 6 cores para jogar!');
      return null;
    }
    
    if (state.betAmount > state.balance) {
      this._errorMessage.set('Saldo insuficiente!');
      return null;
    }

    if (state.betAmount < GAME_CONFIG.MIN_BET) {
      this._errorMessage.set(`Aposta mínima é R$ ${GAME_CONFIG.MIN_BET}!`);
      return null;
    }

    // Reset se necessário
    if (state.isFinished) {
      this.resetRound();
    }

    // Feedback visual imediato: marcar como jogando e debitar localmente
    this._gameState.update(s => ({
      ...s,
      isPlaying: true,
      isFinished: false,
      balance: s.balance - s.betAmount,
      status: GameStatus.PLAYING
    }));
    this._errorMessage.set(null);

    try {
      // ===== CHAMADA AO SERVIDOR =====
      const response = await firstValueFrom(
        this.apiService.post<FrogjackpotPlayResponse>('games/frogjackpot/play', {
          gameId: FROGJACKPOT_GAME_ID,
          amount: state.betAmount,
          selectedColors: state.selectedColorIndices
        })
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || 'Erro ao processar aposta');
      }

      const serverResult = response.data;

      // Revelar cores do sistema com animação (usando dados do servidor)
      await this.revealSystemColorsFromServer(serverResult.systemColors);

      // Construir resultado local para compatibilidade com o componente
      const playerColors = state.playerSlots.filter((c): c is GameColor => c !== null);
      const systemColors = serverResult.systemColors.map(i => AVAILABLE_COLORS[i]);

      const result: GameResult = {
        playerColors,
        systemColors,
        matches: serverResult.matchCount,
        multiplier: serverResult.multiplier,
        betAmount: serverResult.betAmount,
        winAmount: serverResult.winAmount,
        matchPositions: serverResult.matchPositions,
        isJackpot: serverResult.isJackpot
      };

      // Armazenar resultado
      this._lastResult = result;

      // Atualizar estado com dados do SERVIDOR (fonte de verdade)
      this._gameState.update(s => ({
        ...s,
        matchCount: serverResult.matchCount,
        lastWin: serverResult.winAmount,
        balance: serverResult.newBalance, // Saldo real do servidor
        isPlaying: false,
        isFinished: true,
        status: GameStatus.FINISHED
      }));

      // Atualizar o user no AuthService para manter consistência
      this.syncUserBalance(serverResult.newBalance);

      return result;

    } catch (error: any) {
      // Em caso de erro, reverter o estado
      const errorMessage = this.extractErrorMessage(error);
      this._errorMessage.set(errorMessage);

      // Reverter saldo local (o servidor não debitou se houve erro)
      this._gameState.update(s => ({
        ...s,
        isPlaying: false,
        isFinished: false,
        balance: state.balance, // Reverter ao saldo anterior
        status: GameStatus.SELECTING
      }));

      // Buscar saldo atualizado do servidor para garantir consistência
      this.authService.refreshUserData().subscribe({
        next: (user) => {
          if (user) {
            this._gameState.update(s => ({ ...s, balance: user.balance }));
          }
        }
      });

      console.error('Erro na rodada FrogJackpot:', error);
      return null;
    }
  }

  /**
   * Revela as cores do sistema com animação, usando dados do servidor
   */
  private async revealSystemColorsFromServer(systemColorIndices: number[]): Promise<void> {
    this._gameState.update(s => ({ ...s, status: GameStatus.REVEALING }));

    // Revelar uma cor por vez com animação
    for (let i = 0; i < GAME_CONFIG.MAX_SELECTIONS; i++) {
      await this.delay(GAME_CONFIG.REVEAL_DELAY_MS);
      
      this._gameState.update(state => {
        const newSystemSlots = [...state.systemSlots];
        newSystemSlots[i] = this.colorGenerator.getColorByIndex(systemColorIndices[i]);
        return { ...state, systemSlots: newSystemSlots };
      });
    }
  }

  /**
   * Sincroniza o saldo do usuário no AuthService
   * para manter consistência em toda a aplicação
   */
  private syncUserBalance(newBalance: number): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      const updatedUser = { ...currentUser, balance: newBalance };
      // Atualizar localStorage e subject
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
    // Forçar refresh completo para garantir
    this.authService.refreshUserData().subscribe();
  }

  /**
   * Extrai mensagem de erro amigável
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.error) return error.error.error;
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    if (typeof error === 'string') return error;
    return 'Erro ao processar aposta. Tente novamente.';
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
    this._errorMessage.set(null);
    this.clearSelections();
  }

  /**
   * Cleanup do serviço (chamado no ngOnDestroy)
   */
  cleanup(): void {
    this._lastResult = null;
    this._errorMessage.set(null);
    this._gameState.set({ ...INITIAL_GAME_STATE });
  }
}
