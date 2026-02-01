import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
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

  get hasColor(): boolean {
    return this.color !== null && !this.isEmpty;
  }
}
