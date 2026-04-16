import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Partner, PartnerWithdrawal } from '../../../../core/models/partner.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-partner-withdrawals',
  templateUrl: './partner-withdrawals.html',
  styleUrls: ['./partner-withdrawals.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerWithdrawalsComponent implements OnInit, OnDestroy {
  partner: Partner | null = null;
  withdrawals: PartnerWithdrawal[] = [];
  isLoading = true;
  isSubmitting = false;
  currentPage = 1;
  totalPages = 1;
  total = 0;

  showWithdrawModal = false;
  withdrawAmount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;

    // Carregar perfil para saldo
    this.partnerService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.partner = response.data.partner;
          }
          this.cdr.markForCheck();
        }
      });

    // Carregar histórico de saques
    this.partnerService.getMyWithdrawals(this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.withdrawals = response.data.withdrawals;
            this.total = response.data.total;
            this.totalPages = response.data.totalPages;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Falha ao carregar saques');
          this.cdr.markForCheck();
        }
      });
  }

  openWithdrawModal(): void {
    this.withdrawAmount = 0;
    this.showWithdrawModal = true;
    this.cdr.markForCheck();
  }

  closeWithdrawModal(): void {
    this.showWithdrawModal = false;
    this.cdr.markForCheck();
  }

  setPercentage(pct: number): void {
    if (!this.partner) return;
    this.withdrawAmount = Math.floor(this.partner.commissionBalance * pct) / 100 * 100 / 100;
    // Arredondar para 2 casas
    this.withdrawAmount = Math.floor(this.partner.commissionBalance * pct / 100 * 100) / 100;
    this.cdr.markForCheck();
  }

  submitWithdrawal(): void {
    if (this.isSubmitting || !this.partner || this.withdrawAmount <= 0) return;
    if (this.withdrawAmount > this.partner.commissionBalance) {
      this.notificationService.error('Erro', 'Valor excede o saldo disponível');
      return;
    }

    this.isSubmitting = true;
    this.partnerService.requestWithdrawal(this.withdrawAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Solicitação enviada!', 'Aguarde a aprovação do administrador.');
            this.showWithdrawModal = false;
            this.loadData();
          }
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err.error?.message || err.error?.error || 'Falha ao solicitar saque';
          this.notificationService.error('Erro', msg);
          this.cdr.markForCheck();
        }
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadData();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  trackById(index: number, item: PartnerWithdrawal): string {
    return item.id;
  }
}
