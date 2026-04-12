import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Transaction } from '../../../../core/models/transaction.model';
import { User } from '../../../../core/models/user.model';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win';
type FilterStatus = 'all' | 'pending' | 'completed' | 'failed';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe, DateFormatPipe],
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  transactions: Transaction[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  pageSize = 20;
  filterType: FilterType = 'all';
  filterStatus: FilterStatus = 'all';

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
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.subscription.add(
      this.apiService.get<{ transactions: Transaction[]; pagination: any }>('wallet/transactions', {
        page: this.currentPage,
        limit: this.pageSize
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.transactions = response.data.transactions || [];
            if (response.data.pagination) {
              this.totalPages = Math.ceil((response.data.pagination.total || this.transactions.length) / this.pageSize) || 1;
            }
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

  get filteredTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      if (this.filterType !== 'all' && t.type !== this.filterType) return false;
      if (this.filterStatus !== 'all' && t.status !== this.filterStatus) return false;
      return true;
    });
  }

  get totalDeposits(): number {
    return this.transactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalWithdrawals(): number {
    return this.transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalWins(): number {
    return this.transactions
      .filter(t => t.type === 'win' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalBets(): number {
    return this.transactions
      .filter(t => t.type === 'bet' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  setFilterType(type: FilterType): void {
    this.filterType = type;
  }

  setFilterStatus(status: FilterStatus): void {
    this.filterStatus = status;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTransactions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTransactions();
    }
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = { deposit: '💳', withdrawal: '💸', bet: '🎲', win: '🏆' };
    return icons[type] || '💰';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = { deposit: 'Depósito', withdrawal: 'Saque', bet: 'Aposta', win: 'Ganho' };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { pending: 'Pendente', completed: 'Concluída', failed: 'Falhou', cancelled: 'Cancelada' };
    return labels[status] || status;
  }

  getAmountClass(type: string): string {
    return type === 'deposit' || type === 'win' ? 'positive' : 'negative';
  }

  getAmountPrefix(type: string): string {
    return type === 'deposit' || type === 'win' ? '+' : '-';
  }

  trackById(_: number, t: Transaction): string {
    return t.id;
  }

  refresh(): void {
    this.currentPage = 1;
    this.loadTransactions();
  }
}
