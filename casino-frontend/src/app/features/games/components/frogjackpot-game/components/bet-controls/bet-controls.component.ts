import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GAME_CONFIG, QUICK_BET_VALUES } from '../../constants';

@Component({
  selector: 'app-bet-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bet-controls.component.html',
  styleUrl: './bet-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BetControlsComponent {
  @Input() currentBet: number = GAME_CONFIG.MIN_BET;
  @Input() balance = 0;
  @Input() isDisabled = false;

  @Output() betChanged = new EventEmitter<number>();

  readonly quickBetValues = QUICK_BET_VALUES;
  readonly minBet = GAME_CONFIG.MIN_BET;
  readonly maxBet = GAME_CONFIG.MAX_BET;

  onBetInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value) || this.minBet;
    value = this.clampBet(value);
    this.betChanged.emit(value);
  }

  onQuickBet(value: number): void {
    const clampedValue = this.clampBet(value);
    this.betChanged.emit(clampedValue);
  }

  adjustBet(amount: number): void {
    const newBet = this.clampBet(this.currentBet + amount);
    this.betChanged.emit(newBet);
  }

  private clampBet(value: number): number {
    const maxAllowed = Math.min(this.maxBet, this.balance);
    return Math.max(this.minBet, Math.min(value, maxAllowed));
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  }
}
