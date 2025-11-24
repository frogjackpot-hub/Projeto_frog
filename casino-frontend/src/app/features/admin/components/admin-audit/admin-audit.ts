import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, AuditLog } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-admin-audit',
  templateUrl: './admin-audit.html',
  styleUrls: ['./admin-audit.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class AdminAuditComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  filterAction: string = '';
  filterResource: string = '';
  isLoading = false;
  private destroy$ = new Subject<void>();
  private expandedDetails = new Set<string>();

  // Opções de filtro
  actions = ['ADMIN_LOGIN', 'ADMIN_LOGOUT', 'UPDATE_USER', 'DELETE_USER', 'ADD_BALANCE', 'REMOVE_BALANCE', 'BLOCK_USER', 'UNBLOCK_USER', 
             'UPDATE_GAME', 'UPDATE_TRANSACTION', 'UPDATE_CONFIG', 'CREATE_BONUS', 'UPDATE_BONUS', 'DELETE_BONUS'];
  resources = ['user', 'game', 'transaction', 'config', 'bonus'];

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Usar setTimeout para garantir que o carregamento não seja bloqueado
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadAuditLogs();
        });
      }, 50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    
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
          console.log('Resposta dos logs:', response);
          
          // Trata diferentes formatos de resposta
          if (response.success) {
            if (response.data?.logs) {
              this.logs = response.data.logs;
            } else if (Array.isArray(response.data)) {
              this.logs = response.data;
            } else {
              this.logs = [];
            }
          } else {
            this.logs = [];
          }
          
          this.filteredLogs = this.logs;
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Se não houver logs, mostra mensagem informativa (não erro)
          if (this.logs.length === 0) {
            console.log('Nenhum log de auditoria encontrado');
          }
        },
        error: (error) => {
          console.error('Erro ao carregar logs:', error);
          this.isLoading = false;
          this.logs = [];
          this.filteredLogs = [];
          this.cdr.detectChanges();
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
      'ADMIN_LOGIN': 'Login Administrativo',
      'ADMIN_LOGOUT': 'Logout Administrativo',
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
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'action-warning';
    }
    return 'action-info';
  }

  /**
   * Extrair informações do navegador do User Agent
   */
  getBrowserInfo(userAgent: string): string {
    if (!userAgent) return 'Desconhecido';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      return 'Opera';
    }
    
    return 'Outro navegador';
  }

  /**
   * Verificar se há detalhes para exibir
   */
  hasDetails(details: any): boolean {
    if (!details) return false;
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch {
        return false;
      }
    }
    return Object.keys(details).length > 0;
  }

  /**
   * Alternar expansão dos detalhes
   */
  toggleDetails(logId: string): void {
    if (this.expandedDetails.has(logId)) {
      this.expandedDetails.delete(logId);
    } else {
      this.expandedDetails.add(logId);
    }
  }

  /**
   * Verificar se os detalhes estão expandidos
   */
  isDetailsExpanded(logId: string): boolean {
    return this.expandedDetails.has(logId);
  }

  /**
   * Formatar detalhes para exibição
   */
  formatDetails(details: any): any {
    if (!details) return {};
    
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch {
        return { 'Informação': details };
      }
    }

    const formatted: any = {};
    
    // Mapeamento de traduções
    const translations: any = {
      'amount': '💰 Valor',
      'description': '📝 Descrição',
      'reason': '📋 Motivo',
      'duration': '⏱️ Duração',
      'code': '🎟️ Código do Bônus',
      'type': '🏷️ Tipo',
      'value': '💵 Valor do Bônus',
      'field': '🔧 Campo Alterado',
      'old_value': '❌ Valor Anterior',
      'new_value': '✅ Valor Novo',
      'new_status': '✅ Novo Status',
      'previous_status': '❌ Status Anterior',
      'success': '✔️ Sucesso',
      'method': '🔐 Método',
      'min_deposit': '💳 Depósito Mínimo',
      'max_amount': '💰 Valor Máximo',
      'percentage': '📊 Porcentagem',
      'enabled': '🔓 Habilitado'
    };
    
    for (const key in details) {
      if (details.hasOwnProperty(key)) {
        const value = details[key];
        const translatedKey = translations[key.toLowerCase()] || this.formatKey(key);
        
        if (typeof value === 'object' && value !== null) {
          formatted[translatedKey] = JSON.stringify(value, null, 2);
        } else if (typeof value === 'boolean') {
          formatted[translatedKey] = value ? 'Sim' : 'Não';
        } else {
          formatted[translatedKey] = value;
        }
      }
    }
    
    return formatted;
  }

  /**
   * Formatar chave para exibição
   */
  private formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Copiar texto para área de transferência
   */
  copyToClipboard(text: string): void {
    if (!text) {
      this.notificationService.error('Erro', 'Nenhum texto para copiar');
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => {
        this.notificationService.success('Sucesso', 'ID copiado para área de transferência!');
      },
      (err) => {
        console.error('Erro ao copiar:', err);
        this.notificationService.error('Erro', 'Não foi possível copiar o ID');
      }
    );
  }
}
