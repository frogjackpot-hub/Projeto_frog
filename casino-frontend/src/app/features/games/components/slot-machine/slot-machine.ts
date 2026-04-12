import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { SLOT_SYMBOLS, SlotMachineService } from './slot-machine.service';

@Component({
  selector: 'app-slot-machine',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './slot-machine.html',
  styleUrl: './slot-machine.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlotMachineComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gameService = inject(SlotMachineService);

  readonly symbols = SLOT_SYMBOLS;

  /** Símbolos embaralhados exibidos durante a animação de spin */
  spinSymbols: string[] = [];

  get reels() { return this.gameService.reels(); }
  get betAmount() { return this.gameService.betAmount(); }
  get balance() { return this.gameService.balance(); }
  get isWin() { return this.gameService.isWin(); }
  get winAmount() { return this.gameService.winAmount(); }
  get multiplier() { return this.gameService.multiplier(); }
  get status() { return this.gameService.status(); }
  get canSpin() { return this.gameService.canSpin(); }
  get errorMessage() { return this.gameService.errorMessage(); }
  get lastResults() { return this.gameService.lastResults(); }

  /** Valor do input do bet (two-way binding) */
  betInput: number = 5;

  ngOnInit(): void {
    this.gameService.reset();
    this.betInput = this.betAmount;
  }

  ngOnDestroy(): void {
    this.gameService.reset();
  }

  onBetChange(value: number): void {
    this.gameService.setBet(value);
    this.betInput = this.gameService.betAmount();
  }

  adjustBet(delta: number): void {
    this.onBetChange(this.betAmount + delta);
  }

  setQuickBet(amount: number): void {
    this.onBetChange(amount);
  }

  async spin(): Promise<void> {
    // Gera strip de símbolos aleatórios para a animação
    this.spinSymbols = Array.from({ length: 12 }, () =>
      this.symbols[Math.floor(Math.random() * this.symbols.length)]
    );
    await this.gameService.spin();
  }

  playAgain(): void {
    this.gameService.playAgain();
  }

  goBack(): void {
    this.router.navigate(['/games']);
  }

  getMultiplierLabel(multiplier: number): string {
    if (multiplier >= 30) return 'MEGA WIN!';
    if (multiplier >= 10) return 'BIG WIN!';
    if (multiplier >= 3) return 'NICE WIN!';
    if (multiplier > 0) return 'WIN!';
    return '';
  }
}
