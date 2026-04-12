import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';

/** Símbolos do slot e seus valores visuais */
export const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'] as const;

export type SlotSymbol = typeof SLOT_SYMBOLS[number];

export type SlotStatus = 'idle' | 'spinning' | 'revealing' | 'result';

export interface SlotState {
  reels: (SlotSymbol | null)[];
  betAmount: number;
  balance: number;
  isWin: boolean;
  winAmount: number;
  multiplier: number;
  status: SlotStatus;
  lastResults: SlotHistoryEntry[];
}

export interface SlotHistoryEntry {
  reels: string[];
  bet: number;
  win: number;
  multiplier: number;
  isWin: boolean;
}

interface SlotPlayResponse {
  result: string[];
  isWin: boolean;
  winAmount: number;
  multiplier: number;
  newBalance: number;
  betTransaction: string;
}

/** ID fixo do jogo Slot Clássico no banco */
const SLOT_GAME_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const INITIAL_STATE: SlotState = {
  reels: [null, null, null],
  betAmount: 5,
  balance: 0,
  isWin: false,
  winAmount: 0,
  multiplier: 0,
  status: 'idle',
  lastResults: []
};

@Injectable({
  providedIn: 'root'
})
export class SlotMachineService {
  private readonly _state = signal<SlotState>({ ...INITIAL_STATE });
  private readonly _errorMessage = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  readonly reels = computed(() => this._state().reels);
  readonly betAmount = computed(() => this._state().betAmount);
  readonly balance = computed(() => this._state().balance);
  readonly isWin = computed(() => this._state().isWin);
  readonly winAmount = computed(() => this._state().winAmount);
  readonly multiplier = computed(() => this._state().multiplier);
  readonly status = computed(() => this._state().status);
  readonly lastResults = computed(() => this._state().lastResults);

  readonly canSpin = computed(() =>
    this._state().status === 'idle' &&
    this._state().betAmount > 0 &&
    this._state().betAmount <= this._state().balance
  );

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /** Inicializa o estado carregando o saldo do usuário */
  initialize(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this._state.update(s => ({ ...s, balance: user.balance }));
    }
  }

  /** Altera o valor da aposta */
  setBet(amount: number): void {
    if (amount < 1) amount = 1;
    if (amount > 100) amount = 100;
    this._state.update(s => ({ ...s, betAmount: amount }));
    this._errorMessage.set(null);
  }

  /** Executa a jogada chamando o backend */
  async spin(): Promise<void> {
    const state = this._state();

    if (state.status !== 'idle') return;
    if (state.betAmount > state.balance) {
      this._errorMessage.set('Saldo insuficiente');
      return;
    }

    this._errorMessage.set(null);
    this._state.update(s => ({
      ...s,
      status: 'spinning',
      isWin: false,
      winAmount: 0,
      multiplier: 0,
      reels: [null, null, null]
    }));

    // Marca o início do spin para garantir duração mínima visível
    const spinStart = Date.now();
    const MIN_SPIN_MS = 2000; // 2 segundos de animação mínima

    try {
      const response = await firstValueFrom(
        this.apiService.post<SlotPlayResponse>('games/slot/play', {
          gameId: SLOT_GAME_ID,
          amount: state.betAmount
        })
      );

      if (response.success && response.data) {
        const { result, isWin, winAmount, multiplier, newBalance } = response.data;

        // Espera o tempo mínimo de spin antes de revelar
        const elapsed = Date.now() - spinStart;
        const remaining = Math.max(0, MIN_SPIN_MS - elapsed);

        await new Promise(resolve => setTimeout(resolve, remaining));

        // Revela rolo a rolo com delay escalonado
        const reelsCopy: (SlotSymbol | null)[] = [null, null, null];
        const REEL_DELAY = 600; // ms entre cada rolo parar

        for (let i = 0; i < result.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : REEL_DELAY));
          reelsCopy[i] = result[i] as SlotSymbol;
          this._state.update(s => ({
            ...s,
            status: 'revealing',
            reels: [...reelsCopy],
          }));
        }

        // Após último rolo, espera um pouco e mostra resultado final
        await new Promise(resolve => setTimeout(resolve, 500));

        this._state.update(s => ({
          ...s,
          status: 'result',
          reels: result as SlotSymbol[],
          isWin,
          winAmount,
          multiplier,
          balance: newBalance,
          lastResults: [
            { reels: result, bet: state.betAmount, win: winAmount, multiplier, isWin },
            ...s.lastResults.slice(0, 9)
          ]
        }));

        this.authService.updateBalanceLocally(newBalance);
      }
    } catch (error: any) {
      const msg = error?.error?.error || 'Erro ao jogar. Tente novamente.';
      this._errorMessage.set(msg);
      this._state.update(s => ({ ...s, status: 'idle' }));
    }
  }

  /** Reseta para jogar novamente */
  playAgain(): void {
    this._state.update(s => ({
      ...s,
      status: 'idle',
      isWin: false,
      winAmount: 0,
      multiplier: 0
    }));
    this._errorMessage.set(null);
  }

  /** Reseta tudo */
  reset(): void {
    this._state.set({ ...INITIAL_STATE });
    this._errorMessage.set(null);
    this.initialize();
  }
}
