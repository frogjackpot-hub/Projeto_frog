import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-frogjackpot-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frogjackpot-card.component.html',
  styleUrls: ['./frogjackpot-card.component.scss']
})
export class FrogjackpotCardComponent {
  showGameInfo = false;

  @Output() onPlay = new EventEmitter<void>();

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  playFrogJackpot(): void {
    this.notificationService.success(
      'FrogJackpot - Em Breve!',
      '🐸 O jogo mais emocionante do cassino está chegando! Aguarde...'
    );
    this.onPlay.emit();
  }

  openGameInfo(event: Event): void {
    event.stopPropagation();
    this.showGameInfo = true;
    this.cdr.detectChanges();
  }

  closeGameInfo(): void {
    this.showGameInfo = false;
    this.cdr.detectChanges();
  }
}
