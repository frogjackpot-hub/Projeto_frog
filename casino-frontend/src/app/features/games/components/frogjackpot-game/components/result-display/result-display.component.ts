import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GameResult } from '../../models';

@Component({
  selector: 'app-result-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-display.component.html',
  styleUrl: './result-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultDisplayComponent {
  @Input() result: GameResult | null = null;
  @Input() isVisible = false;

  get isWin(): boolean {
    return this.result !== null && this.result.matches > 0;
  }

  get isJackpot(): boolean {
    return this.result !== null && this.result.matches === 6;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  }

  getResultMessage(): string {
    if (!this.result) return '';
    
    if (this.result.matches === 0) {
      return 'Não foi dessa vez!';
    } else if (this.result.matches === 6) {
      return '🎉 JACKPOT! 🎉';
    } else if (this.result.matches >= 4) {
      return '🔥 Incrível!';
    } else if (this.result.matches >= 2) {
      return '✨ Muito bem!';
    } else {
      return '👍 Boa!';
    }
  }

  getResultIcon(): string {
    if (!this.result) return '';
    
    if (this.result.matches === 0) return '😢';
    if (this.result.matches === 6) return '🏆';
    if (this.result.matches >= 4) return '🎯';
    if (this.result.matches >= 2) return '⭐';
    return '✅';
  }
}
