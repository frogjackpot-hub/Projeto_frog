import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PRIZE_TABLE } from '../../constants';
import { PrizeConfig } from '../../models';

@Component({
  selector: 'app-prize-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prize-table.component.html',
  styleUrl: './prize-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrizeTableComponent {
  @Input() highlightMatches: number | null = null;
  @Input() isExpanded = false;

  readonly prizeTable: readonly PrizeConfig[] = PRIZE_TABLE;

  isHighlighted(matches: number): boolean {
    return this.highlightMatches === matches;
  }
}
