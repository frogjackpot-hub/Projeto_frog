import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PartnerCommission } from '../../../../core/models/partner.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-partner-commissions',
  templateUrl: './partner-commissions.html',
  styleUrls: ['./partner-commissions.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerCommissionsComponent implements OnInit, OnDestroy {
  commissions: PartnerCommission[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  total = 0;
  statusFilter = '';

  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCommissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCommissions(): void {
    this.isLoading = true;
    this.partnerService.getMyCommissions(this.currentPage, 20, this.statusFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.commissions = response.data.commissions;
            this.total = response.data.total;
            this.totalPages = response.data.totalPages;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Falha ao carregar comissões');
          this.cdr.markForCheck();
        }
      });
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.loadCommissions();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadCommissions();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'validated': return 'Validada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'validated': return 'status-validated';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  trackById(index: number, item: PartnerCommission): string {
    return item.id;
  }
}
