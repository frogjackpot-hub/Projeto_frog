import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GameColor } from '../../models';

@Component({
  selector: 'app-color-slot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-slot.component.html',
  styleUrl: './color-slot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorSlotComponent {
  @Input() color: GameColor | null = null;
  @Input() index = 0;
  @Input() isRevealing = false;
  @Input() isMatched = false;
  @Input() isEmpty = false;
  @Input() isClickable = false;
  @Input() isDisabled = false;

  /** Emitido quando o slot é clicado (para remoção) */
  @Output() slotClicked = new EventEmitter<number>();

  get hasColor(): boolean {
    return this.color !== null && !this.isEmpty;
  }

  get canClick(): boolean {
    return this.isClickable && this.hasColor && !this.isDisabled;
  }

  onClick(): void {
    if (this.canClick) {
      this.slotClicked.emit(this.index);
    }
  }
}
