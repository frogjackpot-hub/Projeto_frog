import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
  standalone: true,
  imports: [CommonModule, CurrencyPipe]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: any = null;
  period: string = 'today';
  isLoadingStats = true;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadStats();
        });
      }, 50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carregar estatísticas do sistema
   */
  loadStats(): void {
    this.isLoadingStats = true;
    this.adminService.getStats(this.period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          }
          this.isLoadingStats = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingStats = false;
          this.notificationService.error('Erro', 'Não foi possível carregar as estatísticas');
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Alterar período das estatísticas
   */
  changePeriod(period: string): void {
    this.period = period;
    this.loadStats();
  }
}
