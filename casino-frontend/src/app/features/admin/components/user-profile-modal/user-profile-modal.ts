import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

export interface UserProfile {
  user: any;
  recentTransactions: any[];
  stats: {
    totalBets: number;
    totalWon: number;
    totalLost: number;
    totalWagered: number;
    winRate: string;
  };
}

@Component({
  selector: 'app-user-profile-modal',
  templateUrl: './user-profile-modal.html',
  styleUrls: ['./user-profile-modal.scss'],
  standalone: true,
  imports: [CommonModule, CurrencyPipe]
})
export class UserProfileModalComponent implements OnChanges, OnDestroy {
  @Input() user: User | null = null;
  @Input() isOpen = false;

  @Output() closed = new EventEmitter<void>();
  @Output() editUser = new EventEmitter<User>();
  @Output() addBalance = new EventEmitter<User>();
  @Output() removeBalance = new EventEmitter<User>();
  @Output() toggleStatus = new EventEmitter<User>();

  profileData: UserProfile | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.user) {
      this.loadProfile(this.user.id);
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.profileData = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(userId: string): void {
    this.isLoading = true;
    this.profileData = null;

    this.adminService.getUserById(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const txs: any[] = response.data.recentTransactions || [];
            const bets = txs.filter(t => t.type === 'bet');
            const wins = txs.filter(t => t.type === 'win');
            const totalBets = bets.length;
            const totalWon = wins.reduce((s: number, t: any) => s + Number(t.amount), 0);
            const totalLost = bets.reduce((s: number, t: any) => s + Number(t.amount), 0);
            const totalWagered = totalLost;
            const winRate = totalBets > 0
              ? ((wins.length / totalBets) * 100).toFixed(1) + '%'
              : '0%';

            this.profileData = {
              user: response.data.user,
              recentTransactions: txs,
              stats: { totalBets, totalWon, totalLost, totalWagered, winRate }
            };
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar o perfil');
          this.cdr.detectChanges();
        }
      });
  }

  close(): void {
    this.closed.emit();
  }

  onEdit(): void {
    if (this.user) {
      this.close();
      this.editUser.emit(this.user);
    }
  }

  onAddBalance(): void {
    if (this.user) {
      this.close();
      this.addBalance.emit(this.user);
    }
  }

  onRemoveBalance(): void {
    if (this.user) {
      this.close();
      this.removeBalance.emit(this.user);
    }
  }

  onToggleStatus(): void {
    if (this.user) {
      this.close();
      this.toggleStatus.emit(this.user);
    }
  }

  getInitials(user: any): string {
    if (!user) return '?';
    const first = (user.firstName || '').charAt(0).toUpperCase();
    const last = (user.lastName || '').charAt(0).toUpperCase();
    return first + last || user.username?.charAt(0).toUpperCase() || '?';
  }

  getUserStatusBadge(user: any): string {
    return user.isActive === true ? 'Ativo' : 'Bloqueado';
  }

  getStatusClass(user: any): string {
    return user.isActive ? 'status-active' : 'status-inactive';
  }

  getTxIcon(type: string): string {
    const icons: Record<string, string> = {
      deposit: '💳',
      withdrawal: '💸',
      bet: '🎯',
      win: '🏆',
      bonus: '🎁',
      refund: '↩️'
    };
    return icons[type] || '💰';
  }

  getTxLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: 'Depósito',
      withdrawal: 'Saque',
      bet: 'Aposta',
      win: 'Ganho',
      bonus: 'Bônus',
      refund: 'Reembolso'
    };
    return labels[type] || type;
  }

  isPositiveTx(type: string): boolean {
    return type === 'deposit' || type === 'win' || type === 'bonus';
  }
}
