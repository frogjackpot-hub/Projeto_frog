import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

type TabType = 'overview' | 'transactions' | 'games' | 'security' | 'notes';

@Component({
  selector: 'app-admin-user-profile',
  templateUrl: './admin-user-profile.html',
  styleUrls: ['./admin-user-profile.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe]
})
export class AdminUserProfileComponent implements OnInit, OnDestroy {
  // Dados gerais
  profileData: any = null;
  isLoading = true;
  userId: string = '';
  activeTab: TabType = 'overview';

  // Transações (aba paginada)
  allTransactions: any[] = [];
  txPagination = { total: 0, limit: 20, offset: 0 };
  txFilters = { type: '', status: '', startDate: '', endDate: '' };
  isLoadingTx = false;

  // Histórico de jogos (aba paginada)
  gameSessions: any[] = [];
  gamesPagination = { total: 0, limit: 20, offset: 0 };
  isLoadingGames = false;

  // Login history
  loginHistory: any[] = [];
  isLoadingLogin = false;

  // Modal de edição
  showEditModal = false;
  editForm = { firstName: '', lastName: '', email: '', username: '' };

  // Modal de saldo
  showBalanceModal = false;
  balanceForm = { amount: 0, description: '', operation: 'add' as 'add' | 'remove' };

  // Modal de reset de senha
  showPasswordModal = false;
  passwordForm = { newPassword: '', confirmPassword: '' };
  showNewPassword = false;
  showConfirmPassword = false;

  // Auto-refresh
  private refreshInterval: any = null;

  // Notas
  newNoteContent = '';
  newNotePinned = false;

  // Tags
  showTagModal = false;
  newTag = { tag: '', color: '#667eea' };
  tagPresets = [
    { label: 'VIP', color: '#ffd700' },
    { label: 'Suspeito', color: '#ef5350' },
    { label: 'Novo', color: '#66bb6a' },
    { label: 'Inativo', color: '#9e9e9e' },
    { label: 'Alto Valor', color: '#ff9800' },
    { label: 'Verificado', color: '#42a5f5' }
  ];

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
        this.loadFullProfile();
        this.startAutoRefresh();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshProfileSilent();
    }, 30000); // Atualiza a cada 30 segundos
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private refreshProfileSilent(): void {
    this.adminService.getUserFullProfile(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.profileData = response.data;
            this.cdr.detectChanges();
          }
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  // ===== CARREGAMENTO DE DADOS =====

  loadFullProfile(): void {
    this.isLoading = true;
    this.profileData = null;

    this.adminService.getUserFullProfile(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.profileData = response.data;
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

  // ===== ABAS =====

  setTab(tab: TabType): void {
    this.activeTab = tab;

    if (tab === 'transactions' && this.allTransactions.length === 0) {
      this.loadTransactions();
    }
    if (tab === 'games' && this.gameSessions.length === 0) {
      this.loadGameHistory();
    }
    if (tab === 'security' && this.loginHistory.length === 0) {
      this.loadLoginHistory();
    }
  }

  // ===== TRANSAÇÕES =====

  loadTransactions(): void {
    this.isLoadingTx = true;
    const filters = {
      ...this.txFilters,
      limit: this.txPagination.limit,
      offset: this.txPagination.offset
    };

    this.adminService.getUserTransactions(this.userId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.allTransactions = response.data.transactions;
            this.txPagination = response.data.pagination;
          }
          this.isLoadingTx = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingTx = false;
          this.cdr.detectChanges();
        }
      });
  }

  applyTxFilters(): void {
    this.txPagination.offset = 0;
    this.loadTransactions();
  }

  clearTxFilters(): void {
    this.txFilters = { type: '', status: '', startDate: '', endDate: '' };
    this.txPagination.offset = 0;
    this.loadTransactions();
  }

  txNextPage(): void {
    if (this.txPagination.offset + this.txPagination.limit < this.txPagination.total) {
      this.txPagination.offset += this.txPagination.limit;
      this.loadTransactions();
    }
  }

  txPrevPage(): void {
    if (this.txPagination.offset > 0) {
      this.txPagination.offset = Math.max(0, this.txPagination.offset - this.txPagination.limit);
      this.loadTransactions();
    }
  }

  get txCurrentPage(): number {
    return Math.floor(this.txPagination.offset / this.txPagination.limit) + 1;
  }

  get txTotalPages(): number {
    return Math.ceil(this.txPagination.total / this.txPagination.limit) || 1;
  }

  // ===== JOGOS =====

  loadGameHistory(): void {
    this.isLoadingGames = true;

    this.adminService.getUserGameHistory(this.userId, {
      limit: this.gamesPagination.limit,
      offset: this.gamesPagination.offset
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.gameSessions = response.data.sessions;
            this.gamesPagination = response.data.pagination;
          }
          this.isLoadingGames = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingGames = false;
          this.cdr.detectChanges();
        }
      });
  }

  gamesNextPage(): void {
    if (this.gamesPagination.offset + this.gamesPagination.limit < this.gamesPagination.total) {
      this.gamesPagination.offset += this.gamesPagination.limit;
      this.loadGameHistory();
    }
  }

  gamesPrevPage(): void {
    if (this.gamesPagination.offset > 0) {
      this.gamesPagination.offset = Math.max(0, this.gamesPagination.offset - this.gamesPagination.limit);
      this.loadGameHistory();
    }
  }

  get gamesCurrentPage(): number {
    return Math.floor(this.gamesPagination.offset / this.gamesPagination.limit) + 1;
  }

  get gamesTotalPages(): number {
    return Math.ceil(this.gamesPagination.total / this.gamesPagination.limit) || 1;
  }

  // ===== SEGURANÇA / LOGIN HISTORY =====

  refreshSecurityTab(): void {
    this.loadLoginHistory();
    this.loadFullProfile(); // recarrega alertas e logs de atividade
    this.notificationService.success('Atualizado', 'Dados de segurança atualizados');
  }

  loadLoginHistory(): void {
    this.isLoadingLogin = true;

    this.adminService.getUserLoginHistory(this.userId, { limit: 30 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.loginHistory = response.data.history;
          }
          this.isLoadingLogin = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingLogin = false;
          this.cdr.detectChanges();
        }
      });
  }

  resolveAlert(alertId: string): void {
    this.adminService.resolveSecurityAlert(this.userId, alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Alerta resolvido');
            this.loadFullProfile();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível resolver o alerta');
        }
      });
  }

  // ===== NOTAS =====

  addNote(): void {
    if (!this.newNoteContent.trim()) return;

    this.adminService.addUserNote(this.userId, this.newNoteContent, this.newNotePinned)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Nota adicionada');
            if (this.profileData && response.data) {
              this.profileData.adminNotes = [response.data, ...(this.profileData.adminNotes || [])];
            }
            this.newNoteContent = '';
            this.newNotePinned = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível adicionar a nota');
        }
      });
  }

  deleteNote(noteId: string): void {
    if (!confirm('Deseja realmente excluir esta nota?')) return;

    this.adminService.deleteUserNote(this.userId, noteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && this.profileData) {
            this.profileData.adminNotes = this.profileData.adminNotes.filter((n: any) => n.id !== noteId);
            this.notificationService.success('Sucesso', 'Nota deletada');
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível deletar a nota');
        }
      });
  }

  // ===== TAGS =====

  openTagModal(): void {
    this.newTag = { tag: '', color: '#667eea' };
    this.showTagModal = true;
  }

  closeTagModal(): void {
    this.showTagModal = false;
  }

  selectTagPreset(preset: { label: string; color: string }): void {
    this.newTag.tag = preset.label;
    this.newTag.color = preset.color;
  }

  addTag(): void {
    if (!this.newTag.tag.trim()) return;

    this.adminService.addUserTag(this.userId, this.newTag.tag, this.newTag.color)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Tag adicionada');
            if (this.profileData && response.data) {
              this.profileData.tags = [...(this.profileData.tags || []), response.data];
            }
            this.closeTagModal();
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível adicionar a tag');
        }
      });
  }

  removeTag(tagId: string): void {
    this.adminService.removeUserTag(this.userId, tagId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && this.profileData) {
            this.profileData.tags = this.profileData.tags.filter((t: any) => t.id !== tagId);
            this.notificationService.success('Sucesso', 'Tag removida');
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível remover a tag');
        }
      });
  }

  // ===== AÇÕES (MODAIS) =====

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

    // Enviar camelCase (o schema Joi aceita camelCase)
    const updatePayload = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      email: this.editForm.email,
      username: this.editForm.username
    };

    this.adminService.updateUser(this.profileData.user.id, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Usuário atualizado');
            this.closeEditModal();
            this.loadFullProfile();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível atualizar');
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
            this.notificationService.success('Sucesso', `Saldo ${action}`);
            this.closeBalanceModal();
            this.loadFullProfile();
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
              this.notificationService.success('Sucesso', `Usuário ${action}ado`);
              this.loadFullProfile();
            }
          },
          error: () => {
            this.notificationService.error('Erro', `Não foi possível ${action} o usuário`);
          }
        });
    }
  }

  // ===== RESET DE SENHA =====

  openPasswordModal(): void {
    this.passwordForm = { newPassword: '', confirmPassword: '' };
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.showPasswordModal = true;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  resetPassword(): void {
    if (this.passwordForm.newPassword.length < 6) {
      this.notificationService.error('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.notificationService.error('Erro', 'As senhas não coincidem');
      return;
    }

    this.adminService.resetUserPassword(this.userId, this.passwordForm.newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Senha redefinida com sucesso');
            this.closePasswordModal();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível redefinir a senha');
        }
      });
  }

  // ===== EXPORTAÇÃO =====

  exportData(format: 'json' | 'csv'): void {
    if (format === 'csv') {
      this.exportCsv();
      return;
    }

    this.adminService.exportUserData(this.userId, 'json')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const dataStr = JSON.stringify(response.data, null, 2);
            this.downloadFile(dataStr, 'application/json', `usuario_${this.profileData?.user?.username || this.userId}_dados.json`);
            this.notificationService.success('Sucesso', 'Dados exportados em JSON');
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível exportar os dados');
        }
      });
  }

  private exportCsv(): void {
    this.adminService.exportUserDataCsv(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (csvText) => {
          this.downloadFile(csvText, 'text/csv', `usuario_${this.profileData?.user?.username || this.userId}_transacoes.csv`);
          this.notificationService.success('Sucesso', 'Dados exportados em CSV');
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível exportar os dados');
        }
      });
  }

  private downloadFile(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      deposit: '💳', withdrawal: '💸', bet: '🎯',
      win: '🏆', bonus: '🎁', refund: '↩️'
    };
    return icons[type] || '💰';
  }

  getTxLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: 'Depósito', withdrawal: 'Saque', bet: 'Aposta',
      win: 'Ganho', bonus: 'Bônus', refund: 'Reembolso'
    };
    return labels[type] || type;
  }

  isPositiveTx(type: string): boolean {
    return type === 'deposit' || type === 'win' || type === 'bonus';
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      high_bet: '🎰', multiple_ip: '🌐', rapid_transactions: '⚡',
      login_failed: '🔐', suspicious_pattern: '⚠️', large_withdrawal: '💸'
    };
    return icons[type] || '⚠️';
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  getHouseProfit(): number {
    if (!this.profileData?.stats) return 0;
    // Receita da casa = o que o jogador apostou - o que o jogador ganhou
    return this.profileData.stats.totalWagered - this.profileData.stats.totalWon;
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'ADD_BALANCE': 'Saldo Adicionado',
      'REMOVE_BALANCE': 'Saldo Removido',
      'UPDATE_USER': 'Usuário Atualizado',
      'BLOCK_USER': 'Usuário Bloqueado',
      'UNBLOCK_USER': 'Usuário Desbloqueado',
      'RESET_PASSWORD': 'Senha Resetada',
      'ADD_NOTE': 'Nota Adicionada',
      'ADD_TAG': 'Tag Adicionada',
      'EXPORT_USER_DATA': 'Dados Exportados',
      'DELETE_USER': 'Usuário Deletado'
    };
    return labels[action] || action;
  }
}
