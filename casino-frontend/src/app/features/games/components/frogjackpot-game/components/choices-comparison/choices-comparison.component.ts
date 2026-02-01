import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GameColor } from '../../models';
import { ColorSlotComponent } from '../color-slot/color-slot.component';

@Component({
  selector: 'app-choices-comparison',
  standalone: true,
  imports: [CommonModule, ColorSlotComponent],
  templateUrl: './choices-comparison.component.html',
  styleUrl: './choices-comparison.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChoicesComparisonComponent {
  @Input() playerChoices: (GameColor | null)[] = [];
  @Input() systemChoices: (GameColor | null)[] = [];
  @Input() maxSlots = 6;
  @Input() isRevealing = false;

  get slots(): number[] {
    return Array.from({ length: this.maxSlots }, (_, i) => i);
  }

  getPlayerColor(index: number): GameColor | null {
    return this.playerChoices[index] || null;
  }

  getSystemColor(index: number): GameColor | null {
    return this.systemChoices[index] || null;
  }

  isMatched(index: number): boolean {
    const player = this.playerChoices[index];
    const system = this.systemChoices[index];
    return player !== null && system !== null && player.id === system.id;
  }
}
