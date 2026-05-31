import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
    AdminService,
    AdminWithdrawalRequest,
    AdminWithdrawalsResponse,
} from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-withdrawals',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './admin-withdrawals.html',
  styleUrls: ['./admin-withdrawals.scss'],
})
export class AdminWithdrawalsComponent implements OnInit, OnDestroy {
  data: AdminWithdrawalsResponse = {
    pending: [],
    queue: [],
    history: [],
  };
  isLoading = true;
  isReviewing = false;
  revealedKeys: Record<string, boolean> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadWithdrawals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pending(): AdminWithdrawalRequest[] {
    return this.data.pending;
  }

  get queue(): AdminWithdrawalRequest[] {
    return this.data.queue;
  }

  get history(): AdminWithdrawalRequest[] {
    return this.data.history;
  }

  loadWithdrawals(): void {
    this.isLoading = true;
    this.adminService.getWithdrawalRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.data = response.data;
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Nao foi possivel carregar os pedidos de saque');
          this.cdr.detectChanges();
        },
      });
  }

  togglePixKey(withdrawalId: string): void {
    this.revealedKeys[withdrawalId] = !this.revealedKeys[withdrawalId];
  }

  isPixKeyVisible(withdrawalId: string): boolean {
    return !!this.revealedKeys[withdrawalId];
  }

  getDisplayedPixKey(item: AdminWithdrawalRequest): string {
    if (this.isPixKeyVisible(item.id)) {
      return item.pixKey || item.pixKeyMasked || '-';
    }

    return item.pixKeyMasked || '-';
  }

  approve(withdrawalId: string): void {
    this.updateStatus(withdrawalId, 'approved');
  }

  reject(withdrawalId: string): void {
    const reason = window.prompt('Informe o motivo da rejeicao do saque:');
    if (!reason || !reason.trim()) {
      this.notificationService.warning('Motivo obrigatorio', 'Informe um motivo para rejeitar o saque');
      return;
    }

    this.updateStatus(withdrawalId, 'rejected', reason.trim());
  }

  markProcessing(withdrawalId: string): void {
    this.updateStatus(withdrawalId, 'processing');
  }

  markCompleted(withdrawalId: string): void {
    this.updateStatus(withdrawalId, 'completed');
  }

  markFailed(withdrawalId: string): void {
    const reason = window.prompt('Informe o motivo da falha do pagamento:');
    if (!reason || !reason.trim()) {
      this.notificationService.warning('Motivo obrigatorio', 'Informe um motivo para marcar falha');
      return;
    }

    this.updateStatus(withdrawalId, 'failed', reason.trim());
  }

  translateStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'under_review':
        return 'Em analise';
      case 'approved':
        return 'Aprovado';
      case 'processing':
        return 'Em processamento';
      case 'completed':
        return 'Pago';
      case 'rejected':
        return 'Rejeitado';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  trackByWithdrawalId(_: number, item: AdminWithdrawalRequest): string {
    return item.id;
  }

  private updateStatus(
    withdrawalId: string,
    status: 'approved' | 'rejected' | 'processing' | 'completed' | 'failed',
    reason?: string,
  ): void {
    this.isReviewing = true;
    this.adminService.updateTransactionStatus(withdrawalId, status, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isReviewing = false;
          this.notificationService.success('Sucesso', 'Pedido de saque atualizado com sucesso');
          this.loadWithdrawals();
        },
        error: () => {
          this.isReviewing = false;
          this.notificationService.error('Erro', 'Nao foi possivel atualizar o pedido de saque');
          this.cdr.detectChanges();
        },
      });
  }
}
