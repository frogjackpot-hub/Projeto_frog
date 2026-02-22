import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, UserProfileModalComponent]
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  filterStatus: string = 'all';
  isLoading = true;
  
  // Modal de edição
  showEditModal = false;
  selectedUser: User | null = null;
  editForm = {
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  };
  
  // Modal de perfil
  showProfileModal = false;

  // Modal de saldo
  showBalanceModal = false;
  balanceForm = {
    amount: 0,
    description: '',
    operation: 'add' as 'add' | 'remove'
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Usar setTimeout para garantir que o carregamento não seja bloqueado pela notificação
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadUsers();
        });
      }, 50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data;
            this.applyFilters();
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar os usuários');
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = 
        this.filterStatus === 'all' ||
        (this.filterStatus === 'active' && user.isActive) ||
        (this.filterStatus === 'inactive' && !user.isActive) ||
        (this.filterStatus === 'admin' && user.role === 'admin') ||
        (this.filterStatus === 'player' && user.role === 'player');

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editForm = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
  }

  saveUserChanges(): void {
    if (!this.selectedUser) return;

    this.adminService.updateUser(this.selectedUser.id, this.editForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucesso', 'Usuário atualizado com sucesso');
            
            // Atualizar dados localmente
            if (this.selectedUser && response.data) {
              const userIndex = this.users.findIndex(u => u.id === this.selectedUser!.id);
              if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...response.data };
                this.applyFilters();
                this.cdr.detectChanges();
              }
            }
            
            this.closeEditModal();
            setTimeout(() => this.loadUsers(), 100);
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível atualizar o usuário');
        }
      });
  }

  openBalanceModal(user: User, operation: 'add' | 'remove'): void {
    this.selectedUser = user;
    this.balanceForm = {
      amount: 0,
      description: '',
      operation
    };
    this.showBalanceModal = true;
  }

  closeBalanceModal(): void {
    this.showBalanceModal = false;
    this.selectedUser = null;
  }

  saveBalanceChanges(): void {
    if (!this.selectedUser || this.balanceForm.amount <= 0) {
      this.notificationService.error('Erro', 'Digite um valor válido');
      return;
    }

    const service$ = this.balanceForm.operation === 'add'
      ? this.adminService.addBalance(this.selectedUser.id, this.balanceForm.amount, this.balanceForm.description)
      : this.adminService.removeBalance(this.selectedUser.id, this.balanceForm.amount, this.balanceForm.description);

    service$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const action = this.balanceForm.operation === 'add' ? 'adicionado' : 'removido';
            this.notificationService.success('Sucesso', `Saldo ${action} com sucesso`);
            
            // Atualizar o saldo localmente antes de recarregar
            if (this.selectedUser && response.data?.user) {
              const userIndex = this.users.findIndex(u => u.id === this.selectedUser!.id);
              if (userIndex !== -1) {
                this.users[userIndex].balance = response.data.user.balance;
                this.applyFilters();
                this.cdr.detectChanges();
              }
            }
            
            this.closeBalanceModal();
            // Recarregar para garantir sincronização
            setTimeout(() => this.loadUsers(), 100);
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Não foi possível alterar o saldo');
        }
      });
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'bloquear' : 'desbloquear';
    
    if (confirm(`Deseja realmente ${action} o usuário ${user.username}?`)) {
      this.adminService.toggleUserStatus(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Sucesso', `Usuário ${action}ado com sucesso`);
              
              // Atualizar status localmente
              const userIndex = this.users.findIndex(u => u.id === user.id);
              if (userIndex !== -1) {
                this.users[userIndex].isActive = !this.users[userIndex].isActive;
                this.applyFilters();
                this.cdr.detectChanges();
              }
              
              setTimeout(() => this.loadUsers(), 100);
            }
          },
          error: () => {
            this.notificationService.error('Erro', `Não foi possível ${action} o usuário`);
          }
        });
    }
  }

  deleteUser(user: User): void {
    if (user.role === 'admin') {
      this.notificationService.error('Erro', 'Não é possível deletar um administrador');
      return;
    }

    if (confirm(`Deseja realmente DELETAR o usuário ${user.username}? Esta ação é irreversível!`)) {
      this.adminService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Sucesso', 'Usuário deletado com sucesso');
              this.loadUsers();
            }
          },
          error: () => {
            this.notificationService.error('Erro', 'Não foi possível deletar o usuário');
          }
        });
    }
  }

  getUserStatusBadge(user: User): string {
    // isActive = true → usuário ativo
    // isActive = false → usuário bloqueado
    return user.isActive === true ? 'Ativo' : 'Bloqueado';
  }

  getStatusClass(user: User): string {
    return user.isActive ? 'status-active' : 'status-inactive';
  }

  openProfileModal(user: User): void {
    this.selectedUser = user;
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }
}
