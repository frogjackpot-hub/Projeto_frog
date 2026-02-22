import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, GameStats } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-games',
  templateUrl: './admin-games.html',
  styleUrls: ['./admin-games.scss'],
  standalone: true,
  imports: [CommonModule, CurrencyPipe]
})
export class AdminGamesComponent implements OnInit, OnDestroy {
  games: GameStats[] = [];
  period: string = 'all';
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadGameStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGameStats(): void {
    this.isLoading = true;
    this.adminService.getGameStats(this.period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.games = response.data;
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar as estatísticas dos jogos');
          this.cdr.detectChanges();
        }
      });
  }

  changePeriod(period: string): void {
    this.period = period;
    this.loadGameStats();
  }
}
