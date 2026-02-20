import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GameColor } from '../../models';
import { ColorButtonComponent } from '../color-button/color-button.component';

@Component({
  selector: 'app-color-grid',
  standalone: true,
  imports: [CommonModule, ColorButtonComponent],
  templateUrl: './color-grid.component.html',
  styleUrl: './color-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorGridComponent {
  @Input({ required: true }) colors!: readonly GameColor[];
  @Input() selectedIndices: number[] = [];
  @Input() isDisabled = false;
  @Input() maxSelections = 6;

  @Output() colorSelected = new EventEmitter<number>();

  isColorSelected(index: number): boolean {
    return this.selectedIndices.includes(index);
  }

  getSelectionOrder(index: number): number | null {
    const order = this.selectedIndices.indexOf(index);
    return order >= 0 ? order + 1 : null;
  }

  getSelectionCount(index: number): number {
    return this.selectedIndices.filter(i => i === index).length;
  }

  canSelectMore(): boolean {
    return this.selectedIndices.length < this.maxSelections;
  }

  onColorClick(index: number): void {
    this.colorSelected.emit(index);
  }
}
