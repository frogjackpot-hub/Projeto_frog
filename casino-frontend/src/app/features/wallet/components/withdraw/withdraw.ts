import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

interface WithdrawMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  minWithdraw: number;
  maxWithdraw: number;
  fee: number;
  processingTime: string;
}

@Component({
  selector: 'app-withdraw',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe],
  templateUrl: './withdraw.html',
  styleUrls: ['./withdraw.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  selectedMethod: WithdrawMethod | null = null;
  amount: number | null = null;
  pixKey = '';
  isProcessing = false;
  showSuccess = false;
  lastWithdrawAmount = 0;
  showConfirmation = false;

  withdrawMethods: WithdrawMethod[] = [
    {
      id: 'pix',
      name: 'PIX',
      icon: '⚡',
      description: 'Receba em segundos',
      minWithdraw: 10,
      maxWithdraw: 5000,
      fee: 0,
      processingTime: 'Até 1 hora'
    },
    {
      id: 'bank_transfer',
      name: 'Transferência Bancária',
      icon: '🏦',
      description: 'TED para sua conta',
      minWithdraw: 50,
      maxWithdraw: 10000,
      fee: 1.5,
      processingTime: '1-2 dias úteis'
    },
    {
      id: 'crypto',
      name: 'Criptomoedas',
      icon: '₿',
      description: 'Bitcoin, Ethereum, USDT',
      minWithdraw: 20,
      maxWithdraw: 50000,
      fee: 0.5,
      processingTime: '10-60 min'
    }
  ];

  private subscription = new Subscription();

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
    this.selectedMethod = this.withdrawMethods[0];
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  selectMethod(method: WithdrawMethod): void {
    this.selectedMethod = method;
  }

  setPercentage(pct: number): void {
    if (!this.currentUser) return;
    this.amount = Math.floor(this.currentUser.balance * pct) / 100 * 100 / 100;
    // Round to 2 decimals
    this.amount = Math.floor(this.currentUser.balance * pct) / 100;
    this.amount = parseFloat(this.amount.toFixed(2));
  }

  get feeAmount(): number {
    if (!this.amount || !this.selectedMethod) return 0;
    return parseFloat(((this.amount * this.selectedMethod.fee) / 100).toFixed(2));
  }

  get receiveAmount(): number {
    if (!this.amount) return 0;
    return parseFloat((this.amount - this.feeAmount).toFixed(2));
  }

  get isValidAmount(): boolean {
    if (!this.amount || !this.selectedMethod || !this.currentUser) return false;
    return this.amount >= this.selectedMethod.minWithdraw
      && this.amount <= this.selectedMethod.maxWithdraw
      && this.amount <= this.currentUser.balance;
  }

  get canSubmit(): boolean {
    return this.isValidAmount && !this.isProcessing && this.selectedMethod !== null;
  }

  get insufficientBalance(): boolean {
    if (!this.amount || !this.currentUser) return false;
    return this.amount > this.currentUser.balance;
  }

  requestWithdraw(): void {
    if (!this.canSubmit) return;
    this.showConfirmation = true;
  }

  cancelConfirmation(): void {
    this.showConfirmation = false;
  }

  confirmWithdraw(): void {
    if (!this.canSubmit || !this.amount) return;

    this.isProcessing = true;
    this.showConfirmation = false;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.post<{ transaction: any; newBalance: number }>('wallet/withdraw', {
        amount: this.amount
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.authService.updateBalanceLocally(response.data.newBalance);
            this.lastWithdrawAmount = this.amount!;
            this.showSuccess = true;
            this.notificationService.success('Saque solicitado!', `R$ ${this.amount!.toFixed(2)} será enviado para sua conta.`);
            this.amount = null;
          }
          this.isProcessing = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isProcessing = false;
          const msg = error?.error?.error || error?.error?.message || 'Tente novamente mais tarde.';
          this.notificationService.error('Erro no saque', msg);
          this.cdr.markForCheck();
        }
      })
    );
  }

  newWithdraw(): void {
    this.showSuccess = false;
    this.amount = null;
  }
}
