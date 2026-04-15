import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Transaction } from '../../../../core/models/transaction.model';
import { User } from '../../../../core/models/user.model';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-wallet-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DateFormatPipe],
  templateUrl: './wallet-overview.html',
  styleUrl: './wallet-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletOverview implements OnInit, OnDestroy {
  currentUser: User | null = null;
  recentTransactions: Transaction[] = [];
  isLoading = true;

  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.cdr.markForCheck();
      })
    );
    this.loadRecentTransactions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadRecentTransactions(): void {
    this.subscription.add(
      this.apiService.get<{ transactions: Transaction[] }>('wallet/transactions', { page: 1, limit: 5 }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentTransactions = response.data.transactions || [];
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      deposit: '💳',
      withdrawal: '💸',
      bet: '🎲',
      win: '🏆'
    };
    return icons[type] || '💰';
  }

  isPositive(type: string): boolean {
    return type === 'deposit' || type === 'win';
  }

  trackById(_: number, t: Transaction): string {
    return t.id;
  }
}
