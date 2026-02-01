import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GAME_CONFIG } from '../../constants';
import { GameStatus } from '../../models';

@Component({
  selector: 'app-play-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play-button.component.html',
  styleUrl: './play-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayButtonComponent {
  @Input() status: GameStatus = GameStatus.IDLE;
  @Input() selectedCount = 0;
  @Input() isDisabled = false;

  @Output() playClicked = new EventEmitter<void>();
  @Output() resetClicked = new EventEmitter<void>();

  readonly maxSelections = GAME_CONFIG.MAX_SELECTIONS;

  get canPlay(): boolean {
    return this.selectedCount === this.maxSelections && 
           this.status === GameStatus.IDLE;
  }

  get buttonText(): string {
    switch (this.status) {
      case GameStatus.PLAYING:
        return '🎲 Revelando...';
      case GameStatus.REVEALING:
        return '⏳ Aguarde...';
      case GameStatus.FINISHED:
        return '🔄 Jogar Novamente';
      default:
        if (this.selectedCount < this.maxSelections) {
          return `Selecione ${this.maxSelections - this.selectedCount} cores`;
        }
        return '🚀 JOGAR!';
    }
  }

  get showResetButton(): boolean {
    return this.selectedCount > 0 && this.status === GameStatus.IDLE;
  }

  onPlayClick(): void {
    if (this.status === GameStatus.FINISHED) {
      this.resetClicked.emit();
    } else if (this.canPlay) {
      this.playClicked.emit();
    }
  }

  onResetClick(): void {
    this.resetClicked.emit();
  }
}
