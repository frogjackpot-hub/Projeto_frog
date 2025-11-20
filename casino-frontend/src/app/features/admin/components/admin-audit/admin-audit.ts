import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, AuditLog } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-audit',
  templateUrl: './admin-audit.html',
  styleUrls: ['./admin-audit.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminAuditComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  filterAction: string = '';
  filterResource: string = '';
  isLoading = true;
  private destroy$ = new Subject<void>();

  // Opções de filtro
  actions = ['UPDATE_USER', 'DELETE_USER', 'ADD_BALANCE', 'REMOVE_BALANCE', 'BLOCK_USER', 'UNBLOCK_USER', 
             'UPDATE_GAME', 'UPDATE_TRANSACTION', 'UPDATE_CONFIG', 'CREATE_BONUS', 'UPDATE_BONUS', 'DELETE_BONUS'];
  resources = ['user', 'game', 'transaction', 'config', 'bonus'];

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    const filters: any = {
      limit: 100,
      offset: 0
    };

    if (this.filterAction) filters.action = this.filterAction;
    if (this.filterResource) filters.resourceType = this.filterResource;

    this.adminService.getAuditLogs(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.logs = response.data.logs;
            this.filteredLogs = this.logs;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.error('Erro', 'Não foi possível carregar os logs de auditoria');
        }
      });
  }

  applyFilters(): void {
    this.loadAuditLogs();
  }

  clearFilters(): void {
    this.filterAction = '';
    this.filterResource = '';
    this.loadAuditLogs();
  }

  getActionLabel(action: string): string {
    const labels: any = {
      'UPDATE_USER': 'Atualizar Usuário',
      'DELETE_USER': 'Deletar Usuário',
      'ADD_BALANCE': 'Adicionar Saldo',
      'REMOVE_BALANCE': 'Remover Saldo',
      'BLOCK_USER': 'Bloquear Usuário',
      'UNBLOCK_USER': 'Desbloquear Usuário',
      'UPDATE_GAME': 'Atualizar Jogo',
      'UPDATE_TRANSACTION': 'Atualizar Transação',
      'UPDATE_CONFIG': 'Atualizar Configuração',
      'CREATE_BONUS': 'Criar Bônus',
      'UPDATE_BONUS': 'Atualizar Bônus',
      'DELETE_BONUS': 'Deletar Bônus'
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('BLOCK')) {
      return 'action-danger';
    }
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('UNBLOCK')) {
      return 'action-success';
    }
    return 'action-info';
  }
}
