import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { interval, Subscription } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

interface PixCreateResponse {
  transactionId: string;
  amount: number;
  status: string;
  providerPaymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
}

interface PixStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  providerStatus?: string;
  providerPaymentId?: string;
  approvedAt?: string | null;
  newBalance?: number;
}

@Component({
  selector: 'app-deposit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe, QRCodeComponent],
  templateUrl: './deposit.html',
  styleUrls: ['./deposit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepositComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  amount: number | null = null;
  isProcessing = false;
  isCheckingStatus = false;
  showSuccess = false;
  paymentCreated = false;
  lastDepositAmount = 0;
  pixTransactionId: string | null = null;
  pixProviderPaymentId: string | null = null;
  pixQrCode = '';
  pixQrCodeBase64: string | null = null;
  pixTicketUrl: string | null = null;
  pixExpiresAt: string | null = null;
  pixStatus = 'pending';
  copyCodeFeedback = false;

  readonly minAmount = 1;
  readonly maxAmount = 100;
  quickAmounts = [5, 10, 20, 50, 100];

  private subscription = new Subscription();
  private statusPollingSub?: Subscription;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
    this.subscription.unsubscribe();
  }

  setQuickAmount(value: number): void {
    this.amount = value;
  }

  get isValidAmount(): boolean {
    if (!this.amount) return false;
    return this.amount >= this.minAmount && this.amount <= this.maxAmount;
  }

  get canSubmit(): boolean {
    return this.isValidAmount && !this.isProcessing && !this.paymentCreated;
  }

  confirmDeposit(): void {
    if (!this.canSubmit || !this.amount) return;

    this.isProcessing = true;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.post<PixCreateResponse>('wallet/deposit/pix', {
        amount: this.amount
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.lastDepositAmount = response.data.amount;
            this.pixTransactionId = response.data.transactionId;
            this.pixProviderPaymentId = response.data.providerPaymentId;
            this.pixQrCode = response.data.qrCode || '';
            this.pixQrCodeBase64 = response.data.qrCodeBase64;
            this.pixTicketUrl = response.data.ticketUrl;
            this.pixExpiresAt = response.data.expiresAt;
            this.pixStatus = response.data.status || 'pending';
            this.paymentCreated = true;

            this.notificationService.success('PIX gerado', 'Escaneie o QR Code ou copie o codigo PIX para pagar.');
            this.startStatusPolling();
          }
          this.isProcessing = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.error('Erro no deposito', error?.error?.error || 'Tente novamente mais tarde.');
          this.cdr.markForCheck();
        }
      })
    );
  }

  checkDepositStatus(silent = false): void {
    if (!this.pixTransactionId || this.isCheckingStatus) {
      return;
    }

    this.isCheckingStatus = true;
    if (!silent) {
      this.cdr.markForCheck();
    }

    this.subscription.add(
      this.apiService.get<PixStatusResponse>(`wallet/deposit/${this.pixTransactionId}/status`).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.pixStatus = response.data.providerStatus || response.data.status;
            if (response.data.status === 'completed') {
              this.stopStatusPolling();
              this.showSuccess = true;
              this.paymentCreated = false;
              if (typeof response.data.newBalance === 'number') {
                this.authService.updateBalanceLocally(response.data.newBalance);
              }
              this.notificationService.success('Pagamento aprovado!', `R$ ${this.lastDepositAmount.toFixed(2)} creditado no seu saldo.`);
            }
          }
          this.isCheckingStatus = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isCheckingStatus = false;
          if (!silent) {
            this.notificationService.warning('Status pendente', 'Ainda nao foi possivel confirmar o pagamento.');
          }
          this.cdr.markForCheck();
        }
      })
    );
  }

  copyPixCode(): void {
    if (!this.pixQrCode) {
      return;
    }

    navigator.clipboard.writeText(this.pixQrCode).then(() => {
      this.copyCodeFeedback = true;
      this.notificationService.success('Codigo PIX copiado', 'Cole no app do seu banco para pagar.');
      setTimeout(() => {
        this.copyCodeFeedback = false;
        this.cdr.markForCheck();
      }, 1500);
      this.cdr.markForCheck();
    });
  }

  openTicket(): void {
    if (this.pixTicketUrl) {
      window.open(this.pixTicketUrl, '_blank', 'noopener');
    }
  }

  private startStatusPolling(): void {
    this.stopStatusPolling();
    this.statusPollingSub = interval(10000).subscribe(() => this.checkDepositStatus(true));
    this.subscription.add(this.statusPollingSub);
  }

  private stopStatusPolling(): void {
    if (this.statusPollingSub) {
      this.statusPollingSub.unsubscribe();
      this.statusPollingSub = undefined;
    }
  }

  newDeposit(): void {
    this.stopStatusPolling();
    this.showSuccess = false;
    this.amount = null;
    this.paymentCreated = false;
    this.pixTransactionId = null;
    this.pixProviderPaymentId = null;
    this.pixQrCode = '';
    this.pixQrCodeBase64 = null;
    this.pixTicketUrl = null;
    this.pixExpiresAt = null;
    this.pixStatus = 'pending';
  }
}
