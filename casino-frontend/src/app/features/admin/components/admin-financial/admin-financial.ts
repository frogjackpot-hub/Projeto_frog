import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
    AdminFinancialDailyFlow,
    AdminFinancialDistribution,
    AdminFinancialStats,
    AdminService
} from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-financial',
  templateUrl: './admin-financial.html',
  styleUrls: ['./admin-financial.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe]
})
export class AdminFinancialComponent implements OnInit, OnDestroy {
  stats: AdminFinancialStats | null = null;
  period = '30d';
  customStartDate = '';
  customEndDate = '';
  ledgerLimit = 20;
  ledgerOffset = 0;
  isLoading = true;
  isRefreshing = false;
  isReviewingWithdrawal = false;

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFinancialStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFinancialStats(isManualRefresh = false): void {
    if (isManualRefresh) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }

    const options = {
      limit: this.ledgerLimit,
      offset: this.ledgerOffset,
      startDate: this.period === 'custom' ? this.customStartDate : undefined,
      endDate: this.period === 'custom' ? this.customEndDate : undefined
    };

    this.adminService.getFinancialStats(this.period, options)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          }
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.notificationService.error('Erro', 'Não foi possível carregar o painel financeiro');
          this.cdr.detectChanges();
        }
      });
  }

  changePeriod(period: string): void {
    this.period = period;
    this.ledgerOffset = 0;

    if (period !== 'custom') {
      this.loadFinancialStats();
    }
  }

  applyCustomPeriod(): void {
    if (!this.customStartDate || !this.customEndDate) {
      this.notificationService.warning('Período customizado', 'Selecione data inicial e final');
      return;
    }

    this.period = 'custom';
    this.ledgerOffset = 0;
    this.loadFinancialStats();
  }

  get dailyFlow(): AdminFinancialDailyFlow[] {
    return this.stats?.dailyFlow ?? [];
  }

  get distribution(): AdminFinancialDistribution[] {
    return this.stats?.transactionDistribution ?? [];
  }

  get ledgerItems(): AdminFinancialStats['ledger']['items'] {
    return this.stats?.ledger?.items ?? [];
  }

  get pendingWithdrawals(): AdminFinancialStats['pendingWithdrawals'] {
    return this.stats?.pendingWithdrawals ?? [];
  }

  get partnerCommissions(): AdminFinancialStats['partnerCommissions'] {
    return this.stats?.partnerCommissions ?? [];
  }

  get alerts(): AdminFinancialStats['alerts'] {
    return this.stats?.alerts ?? [];
  }

  get canGoPrevPage(): boolean {
    return this.ledgerOffset > 0;
  }

  get canGoNextPage(): boolean {
    if (!this.stats?.ledger?.pagination) {
      return false;
    }
    const { total } = this.stats.ledger.pagination;
    return this.ledgerOffset + this.ledgerLimit < total;
  }

  goToNextPage(): void {
    if (!this.canGoNextPage) {
      return;
    }

    this.ledgerOffset += this.ledgerLimit;
    this.loadFinancialStats(true);
  }

  goToPreviousPage(): void {
    if (!this.canGoPrevPage) {
      return;
    }

    this.ledgerOffset = Math.max(0, this.ledgerOffset - this.ledgerLimit);
    this.loadFinancialStats(true);
  }

  refreshData(): void {
    this.loadFinancialStats(true);
  }

  approvePendingWithdrawal(withdrawalId: string): void {
    this.reviewPendingWithdrawal(withdrawalId, 'approved');
  }

  rejectPendingWithdrawal(withdrawalId: string): void {
    this.reviewPendingWithdrawal(withdrawalId, 'rejected');
  }

  private reviewPendingWithdrawal(withdrawalId: string, status: 'approved' | 'rejected'): void {
    this.isReviewingWithdrawal = true;
    this.adminService.updateTransactionStatus(withdrawalId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isReviewingWithdrawal = false;
          this.notificationService.success('Sucesso', `Saque ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso`);
          this.loadFinancialStats(true);
        },
        error: () => {
          this.isReviewingWithdrawal = false;
          this.notificationService.error('Erro', 'Não foi possível atualizar o saque pendente');
          this.cdr.detectChanges();
        }
      });
  }

  exportReport(): void {
    if (!this.stats) {
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      period: this.period,
      data: this.stats
    };

    this.downloadFile(
      JSON.stringify(payload, null, 2),
      `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
  }

  exportCsv(): void {
    const rows = this.ledgerItems;
    if (!rows.length) {
      this.notificationService.warning('Exportação', 'Não há transações para exportar');
      return;
    }

    const header = 'Data,Tipo,Usuario,Valor,Status,Origem,SaldoApos,Descricao';
    const body = rows
      .map((row) => {
        const safeDescription = (row.description || '').replace(/"/g, '""');
        const safeUser = (row.user || '').replace(/"/g, '""');
        const safeOrigin = (row.origin || '').replace(/"/g, '""');
        return [
          row.date,
          this.translateTransactionType(row.type),
          `"${safeUser}"`,
          row.value.toFixed(2),
          this.translateStatus(row.status),
          `"${safeOrigin}"`,
          row.balanceAfter !== null ? row.balanceAfter.toFixed(2) : '',
          `"${safeDescription}"`
        ].join(',');
      })
      .join('\n');

    this.downloadFile(
      `${header}\n${body}`,
      `financeiro-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  }

  exportExcel(): void {
    const rows = this.ledgerItems;
    if (!rows.length) {
      this.notificationService.warning('Exportação', 'Não há transações para exportar');
      return;
    }

    const header = 'Data\tTipo\tUsuario\tValor\tStatus\tOrigem\tSaldoApos\tDescricao';
    const body = rows
      .map((row) => [
        row.date,
        this.translateTransactionType(row.type),
        row.user,
        row.value.toFixed(2),
        this.translateStatus(row.status),
        row.origin,
        row.balanceAfter !== null ? row.balanceAfter.toFixed(2) : '',
        row.description || ''
      ].join('\t'))
      .join('\n');

    this.downloadFile(
      `${header}\n${body}`,
      `financeiro-ledger-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8;'
    );
  }

  viewFullHistory(): void {
    this.router.navigate(['/admin/audit']);
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  get ledgerCurrentPage(): number {
    return Math.floor(this.ledgerOffset / this.ledgerLimit) + 1;
  }

  get ledgerTotalPages(): number {
    const total = this.stats?.ledger?.pagination?.total ?? 0;
    if (total === 0) {
      return 1;
    }
    return Math.ceil(total / this.ledgerLimit);
  }

  get maxDailyVolume(): number {
    if (!this.dailyFlow.length) {
      return 0;
    }

    return this.dailyFlow.reduce((max, day) => {
      const current = Math.max(day.deposits, day.withdrawals);
      return current > max ? current : max;
    }, 0);
  }

  getBarWidth(value: number): number {
    if (this.maxDailyVolume <= 0) {
      return 0;
    }

    return Math.min(100, (value / this.maxDailyVolume) * 100);
  }

  get maxAbsoluteProfitValue(): number {
    const profits = this.stats?.charts?.profitByDay?.map((item) => Math.abs(item.profit)) ?? [];
    if (!profits.length) {
      return 0;
    }
    return Math.max(...profits);
  }

  get maxDepositsVsWithdrawalsValue(): number {
    const values = this.stats?.charts?.depositsVsWithdrawals?.flatMap((item) => [item.deposits, item.withdrawals]) ?? [];
    if (!values.length) {
      return 0;
    }
    return Math.max(...values);
  }

  get maxBetsVsWinsValue(): number {
    const values = this.stats?.charts?.betsVsWins?.flatMap((item) => [item.bets, item.wins]) ?? [];
    if (!values.length) {
      return 0;
    }
    return Math.max(...values);
  }

  getChartBarWidth(value: number, max: number): number {
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (value / max) * 100);
  }

  absoluteValue(value: number): number {
    return Math.abs(value);
  }

  translateTransactionType(type: string): string {
    switch (type) {
      case 'deposit':
        return 'Depósito';
      case 'withdrawal':
        return 'Saque';
      case 'bet':
        return 'Aposta';
      case 'win':
        return 'Prêmio';
      case 'partner_commission':
        return 'Comissão parceiro';
      case 'partner_payment':
        return 'Pagamento parceiro';
      case 'admin_adjustment':
        return 'Ajuste admin';
      default:
        return type;
    }
  }

  translateStatus(status: string): string {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  trackByLedgerId(_: number, item: AdminFinancialStats['ledger']['items'][number]): string {
    return item.id;
  }

  trackByWithdrawalId(_: number, item: AdminFinancialStats['pendingWithdrawals'][number]): string {
    return item.id;
  }
}
