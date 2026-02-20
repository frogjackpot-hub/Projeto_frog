import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GameColor } from '../../models';

/**
 * Componente de botão de cor individual
 * Representa uma cor selecionável no grid do jogo
 */
@Component({
  selector: 'app-color-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-button.component.html',
  styleUrls: ['./color-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorButtonComponent {
  /** Cor a ser exibida */
  @Input({ required: true }) color!: GameColor;
  
  /** Índice da cor no array */
  @Input({ required: true }) index!: number;
  
  /** Indica se a cor está selecionada */
  @Input() isSelected = false;
  
  /** Indica se a cor está desabilitada */
  @Input() isDisabled = false;
  
  /** Ordem de seleção (1-6), null se não selecionada */
  @Input() selectionOrder: number | null = null;

  /** Quantas vezes essa cor foi selecionada */
  @Input() selectionCount = 0;

  /** Evento emitido ao clicar no botão */
  @Output() colorClick = new EventEmitter<number>();

  /**
   * Handler de clique
   */
  onClick(): void {
    if (!this.isDisabled) {
      this.colorClick.emit(this.index);
    }
  }
}
