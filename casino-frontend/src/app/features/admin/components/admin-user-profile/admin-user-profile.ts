import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

export interface UserProfileData {
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
  selector: 'app-admin-user-profile',
  templateUrl: './admin-user-profile.html',
  styleUrls: ['./admin-user-profile.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe]
})
export class AdminUserProfileComponent implements OnInit, OnDestroy {
  profileData: UserProfileData | null = null;
  isLoading = true;
  userId: string = '';

  // Modal de edição
  showEditModal = false;
  editForm = {
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  };

  // Modal de saldo
  showBalanceModal = false;
  balanceForm = {
    amount: 0,
    description: '',
    operation: 'add' as 'add' | 'remove'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.userId = params['id'];
      if (this.userId) {
        this.loadProfile(this.userId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
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
            const bets = txs.filter((t: any) => t.type === 'bet');
            const wins = txs.filter((t: any) => t.type === 'win');
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
          this.notificationService.error('Erro', 'Não foi possível carregar o perfil do usuário');
          this.cdr.detectChanges();
        }
      });
  }

  // ===== AÇÕES =====

  openEditModal(): void {
    if (!this.profileData) return;
    const u = this.profileData.user;
    this.editForm = {
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      username: u.username || ''
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  saveUserChanges(): void {
    if (!this.profileData) return;

    this.adminService.updateUser(this.profileData.user.id, this.editForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Usuário atualizado com sucesso');
            this.closeEditModal();
            this.loadProfile(this.userId);
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível atualizar o usuário');
        }
      });
  }

  openBalanceModal(operation: 'add' | 'remove'): void {
    this.balanceForm = { amount: 0, description: '', operation };
    this.showBalanceModal = true;
  }

  closeBalanceModal(): void {
    this.showBalanceModal = false;
  }

  saveBalanceChanges(): void {
    if (!this.profileData || this.balanceForm.amount <= 0) {
      this.notificationService.error('Erro', 'Digite um valor válido');
      return;
    }

    const userId = this.profileData.user.id;
    const service$ = this.balanceForm.operation === 'add'
      ? this.adminService.addBalance(userId, this.balanceForm.amount, this.balanceForm.description)
      : this.adminService.removeBalance(userId, this.balanceForm.amount, this.balanceForm.description);

    service$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const action = this.balanceForm.operation === 'add' ? 'adicionado' : 'removido';
            this.notificationService.success('Sucesso', `Saldo ${action} com sucesso`);
            this.closeBalanceModal();
            this.loadProfile(this.userId);
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível alterar o saldo');
        }
      });
  }

  toggleUserStatus(): void {
    if (!this.profileData) return;
    const user = this.profileData.user;
    const action = user.isActive ? 'bloquear' : 'desbloquear';

    if (confirm(`Deseja realmente ${action} o usuário ${user.username}?`)) {
      this.adminService.toggleUserStatus(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Sucesso', `Usuário ${action}ado com sucesso`);
              this.loadProfile(this.userId);
            }
          },
          error: () => {
            this.notificationService.error('Erro', `Não foi possível ${action} o usuário`);
          }
        });
    }
  }

  // ===== HELPERS =====

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
