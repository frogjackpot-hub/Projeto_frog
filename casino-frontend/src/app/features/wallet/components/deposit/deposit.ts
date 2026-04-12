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

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  minDeposit: number;
  maxDeposit: number;
  fee: number;
  processingTime: string;
}

@Component({
  selector: 'app-deposit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe],
  templateUrl: './deposit.html',
  styleUrls: ['./deposit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepositComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  selectedMethod: PaymentMethod | null = null;
  amount: number | null = null;
  isProcessing = false;
  showSuccess = false;
  lastDepositAmount = 0;

  quickAmounts = [10, 25, 50, 100, 250, 500];

  paymentMethods: PaymentMethod[] = [
    {
      id: 'pix',
      name: 'PIX',
      icon: '⚡',
      description: 'Transferência instantânea',
      minDeposit: 5,
      maxDeposit: 10000,
      fee: 0,
      processingTime: 'Instantâneo'
    },
    {
      id: 'credit_card',
      name: 'Cartão de Crédito',
      icon: '💳',
      description: 'Visa, Mastercard, Elo',
      minDeposit: 10,
      maxDeposit: 5000,
      fee: 2.5,
      processingTime: 'Instantâneo'
    },
    {
      id: 'boleto',
      name: 'Boleto Bancário',
      icon: '📄',
      description: 'Compensação em até 3 dias',
      minDeposit: 20,
      maxDeposit: 10000,
      fee: 0,
      processingTime: '1-3 dias úteis'
    },
    {
      id: 'crypto',
      name: 'Criptomoedas',
      icon: '₿',
      description: 'Bitcoin, Ethereum, USDT',
      minDeposit: 10,
      maxDeposit: 50000,
      fee: 0,
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
    this.selectedMethod = this.paymentMethods[0];
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
    if (this.amount && this.amount < method.minDeposit) {
      this.amount = method.minDeposit;
    }
  }

  setQuickAmount(value: number): void {
    this.amount = value;
  }

  get feeAmount(): number {
    if (!this.amount || !this.selectedMethod) return 0;
    return (this.amount * this.selectedMethod.fee) / 100;
  }

  get totalAmount(): number {
    if (!this.amount) return 0;
    return this.amount + this.feeAmount;
  }

  get isValidAmount(): boolean {
    if (!this.amount || !this.selectedMethod) return false;
    return this.amount >= this.selectedMethod.minDeposit && this.amount <= this.selectedMethod.maxDeposit;
  }

  get canSubmit(): boolean {
    return this.isValidAmount && !this.isProcessing && this.selectedMethod !== null;
  }

  confirmDeposit(): void {
    if (!this.canSubmit || !this.amount) return;

    this.isProcessing = true;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.post<{ transaction: any; newBalance: number }>('wallet/deposit', {
        amount: this.amount
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.authService.updateBalanceLocally(response.data.newBalance);
            this.lastDepositAmount = this.amount!;
            this.showSuccess = true;
            this.notificationService.success('Depósito realizado!', `R$ ${this.amount!.toFixed(2)} adicionado à sua conta.`);
            this.amount = null;
          }
          this.isProcessing = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.error('Erro no depósito', error?.error?.message || 'Tente novamente mais tarde.');
          this.cdr.markForCheck();
        }
      })
    );
  }

  newDeposit(): void {
    this.showSuccess = false;
    this.amount = null;
  }
}
