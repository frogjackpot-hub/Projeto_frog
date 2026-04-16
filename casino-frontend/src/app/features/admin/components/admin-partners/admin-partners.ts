import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
    Partner,
    PartnerAdminMetrics,
    PartnerCommission,
    PartnerRanking,
    PartnerWithdrawal
} from '../../../../core/models/partner.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { PartnerService } from '../../../../core/services/partner.service';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-admin-partners',
  templateUrl: './admin-partners.html',
  styleUrls: ['./admin-partners.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe]
})
export class AdminPartnersComponent implements OnInit, OnDestroy {
  // Tabs
  activeTab: 'partners' | 'withdrawals' | 'commissions' | 'ranking' = 'partners';

  // Metrics
  metrics: PartnerAdminMetrics | null = null;
  isLoadingMetrics = true;

  // Partners
  partners: Partner[] = [];
  partnersPage = 1;
  partnersTotalPages = 1;
  partnersTotal = 0;
  isLoadingPartners = true;

  // Filtros
  searchQuery = '';
  filterStatus = '';
  filterType = '';
  filterDatePreset = '';
  filterDateFrom = '';
  filterDateTo = '';
  sortBy = 'created_at';
  sortOrder = 'DESC';

  // Withdrawals
  withdrawals: PartnerWithdrawal[] = [];
  withdrawalsPage = 1;
  withdrawalsTotalPages = 1;
  withdrawalsTotal = 0;
  withdrawalFilter = '';
  isLoadingWithdrawals = true;

  // Pending Commissions
  pendingCommissions: PartnerCommission[] = [];
  pendingCommissionsPage = 1;
  pendingCommissionsTotalPages = 1;
  pendingCommissionsTotal = 0;
  isLoadingPendingCommissions = true;

  // Ranking
  ranking: PartnerRanking[] = [];
  rankingPage = 1;
  rankingTotalPages = 1;
  rankingTotal = 0;
  rankingSortBy = 'total_commissions_earned';
  isLoadingRanking = true;

  // Create Partner Modal
  showCreateModal = false;
  newPartnerUserId = '';
  newCommissionType: 'percentage' | 'fixed' = 'percentage';
  newCommissionValue = 10;
  newCommissionThreshold = 0;
  isCreating = false;

  // Config Modal
  showConfigModal = false;
  editingPartner: Partner | null = null;
  editCommissionType: 'percentage' | 'fixed' = 'percentage';
  editCommissionValue = 10;
  editCommissionThreshold = 0;
  editValidationPeriodHours = 24;
  isSavingConfig = false;

  // Review Modal
  showReviewModal = false;
  reviewingWithdrawal: PartnerWithdrawal | null = null;
  reviewStatus: 'approved' | 'rejected' = 'approved';
  reviewNotes = '';
  isReviewing = false;

  // Partner Detail Modal
  showPartnerDetailModal = false;
  selectedPartnerDetail: Partner | null = null;

  // Actions dropdown
  activeActionsPartnerId: string | null = null;
  dropdownPos = { top: '0px', left: '0px' };

  // Confirm Modal
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  isConfirming = false;

  private searchTimeout: any;
  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
    this.loadPartners();
    this.loadWithdrawals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  // ==================
  // TABS
  // ==================

  setTab(tab: 'partners' | 'withdrawals' | 'commissions' | 'ranking'): void {
    this.activeTab = tab;
    if (tab === 'commissions' && this.pendingCommissions.length === 0) {
      this.loadPendingCommissions();
    }
    if (tab === 'ranking' && this.ranking.length === 0) {
      this.loadRanking();
    }
    this.cdr.markForCheck();
  }

  // ==================
  // METRICS
  // ==================

  loadMetrics(): void {
    this.isLoadingMetrics = true;
    this.partnerService.getAdminMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.metrics = res.data;
          }
          this.isLoadingMetrics = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingMetrics = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ==================
  // PARTNERS
  // ==================

  loadPartners(): void {
    this.isLoadingPartners = true;
    const filters: any = {};

    if (this.searchQuery.trim()) filters.search = this.searchQuery.trim();
    if (this.filterStatus) filters.status = this.filterStatus;
    if (this.filterType) filters.commissionType = this.filterType;
    if (this.filterDateFrom) filters.dateFrom = this.filterDateFrom;
    if (this.filterDateTo) filters.dateTo = this.filterDateTo;
    filters.sortBy = this.sortBy;
    if (this.sortOrder !== 'DESC') filters.sortOrder = this.sortOrder;

    this.partnerService.listPartners(this.partnersPage, 20, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.partners = res.data.partners;
            this.partnersTotal = res.data.total;
            this.partnersTotalPages = res.data.totalPages;
          }
          this.isLoadingPartners = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingPartners = false;
          this.notificationService.error('Erro', 'Falha ao carregar parceiros');
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.partnersPage = 1;
      this.loadPartners();
    }, 400);
  }

  applyFilters(): void {
    this.partnersPage = 1;
    this.loadPartners();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterStatus = '';
    this.filterType = '';
    this.filterDatePreset = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.sortBy = 'created_at';
    this.sortOrder = 'DESC';
    this.partnersPage = 1;
    this.loadPartners();
  }

  applyDatePreset(preset: string): void {
    this.filterDatePreset = preset;
    const now = new Date();
    this.filterDateTo = now.toISOString().split('T')[0];

    if (preset === 'today') {
      this.filterDateFrom = this.filterDateTo;
    } else if (preset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      this.filterDateFrom = d.toISOString().split('T')[0];
    } else if (preset === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      this.filterDateFrom = d.toISOString().split('T')[0];
    } else if (preset === 'custom') {
      return;
    } else {
      this.filterDateFrom = '';
      this.filterDateTo = '';
    }
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'DESC';
    }
    this.partnersPage = 1;
    this.loadPartners();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return '↕';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  goToPartnersPage(page: number): void {
    if (page < 1 || page > this.partnersTotalPages) return;
    this.partnersPage = page;
    this.loadPartners();
  }

  getPages(current: number, total: number): number[] {
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // Actions dropdown
  toggleActions(partnerId: string, event: Event): void {
    event.stopPropagation();
    if (this.activeActionsPartnerId === partnerId) {
      this.activeActionsPartnerId = null;
    } else {
      this.activeActionsPartnerId = partnerId;
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const dropdownWidth = 192;
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < dropdownHeight + 10
        ? rect.top - dropdownHeight - 4
        : rect.bottom + 4;
      this.dropdownPos = {
        top: `${top}px`,
        left: `${Math.max(4, rect.right - dropdownWidth)}px`
      };
    }
    this.cdr.markForCheck();
  }

  closeActions(): void {
    this.activeActionsPartnerId = null;
    this.cdr.markForCheck();
  }

  // ==================
  // PARTNER ACTIONS
  // ==================

  viewPartnerDetails(partner: Partner): void {
    this.closeActions();
    this.selectedPartnerDetail = partner;
    this.showPartnerDetailModal = true;
    this.cdr.markForCheck();
  }

  closePartnerDetailModal(): void {
    this.showPartnerDetailModal = false;
    this.selectedPartnerDetail = null;
    this.cdr.markForCheck();
  }

  togglePartnerActive(partner: Partner): void {
    const action = partner.isActive ? 'bloquear' : 'ativar';
    this.showConfirm(
      `${partner.isActive ? 'Bloquear' : 'Ativar'} Parceiro`,
      `Tem certeza que deseja ${action} o parceiro ${partner.username}?`,
      () => {
        this.partnerService.togglePartner(partner.id, !partner.isActive)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.success) {
                partner.isActive = !partner.isActive;
                this.notificationService.success('Sucesso', `Parceiro ${partner.isActive ? 'ativado' : 'bloqueado'}`);
                this.loadMetrics();
                this.cdr.markForCheck();
              }
              this.closeConfirm();
            },
            error: () => {
              this.notificationService.error('Erro', 'Falha ao alterar status');
              this.closeConfirm();
            }
          });
      }
    );
    this.closeActions();
  }

  regenerateCode(partner: Partner): void {
    this.showConfirm(
      'Regenerar Código',
      `Gerar novo código para ${partner.username}? O código atual (${partner.referralCode}) será desativado.`,
      () => {
        this.partnerService.regenerateCode(partner.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.success && res.data) {
                this.notificationService.success('Código Regenerado', `Novo código: ${res.data.partner.referralCode}`);
                this.loadPartners();
              }
              this.closeConfirm();
            },
            error: () => {
              this.notificationService.error('Erro', 'Falha ao regenerar código');
              this.closeConfirm();
            }
          });
      }
    );
    this.closeActions();
  }

  deletePartner(partner: Partner): void {
    this.showConfirm(
      'Excluir Parceiro',
      `⚠️ ATENÇÃO: Esta ação é irreversível! Excluir ${partner.username} (${partner.referralCode}) apagará todas as comissões e saques vinculados.`,
      () => {
        this.isConfirming = true;
        this.cdr.markForCheck();
        this.partnerService.deletePartner(partner.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.success) {
                this.notificationService.success('Parceiro excluído', `${partner.username} foi removido`);
                this.loadPartners();
                this.loadMetrics();
              }
              this.closeConfirm();
            },
            error: () => {
              this.notificationService.error('Erro', 'Falha ao excluir parceiro');
              this.closeConfirm();
            }
          });
      }
    );
    this.closeActions();
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('Copiado', `${label} copiado!`);
    });
    this.closeActions();
  }

  getReferralLink(code: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/register?ref=${code}`;
  }

  validatePendingCommissions(): void {
    this.partnerService.validatePendingCommissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.success('Sucesso', `${res.data?.validatedCount || 0} comissões validadas`);
            this.loadPartners();
            this.loadMetrics();
            if (this.activeTab === 'commissions') this.loadPendingCommissions();
          }
        },
        error: () => {
          this.notificationService.error('Erro', 'Falha ao validar comissões');
        }
      });
  }

  // ==================
  // CREATE PARTNER
  // ==================

  openCreateModal(): void {
    this.newPartnerUserId = '';
    this.newCommissionType = 'percentage';
    this.newCommissionValue = 10;
    this.newCommissionThreshold = 0;
    this.showCreateModal = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.cdr.markForCheck();
  }

  createPartner(): void {
    if (this.isCreating || !this.newPartnerUserId.trim()) return;

    this.isCreating = true;
    this.partnerService.createPartner({
      userId: this.newPartnerUserId.trim(),
      commissionType: this.newCommissionType,
      commissionValue: this.newCommissionValue,
      commissionThreshold: this.newCommissionThreshold
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.success('Parceiro criado!', `Código: ${res.data?.partner.referralCode}`);
            this.showCreateModal = false;
            this.loadPartners();
            this.loadMetrics();
          }
          this.isCreating = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isCreating = false;
          const msg = err.error?.message || err.error?.error || 'Falha ao criar parceiro';
          this.notificationService.error('Erro', msg);
          this.cdr.markForCheck();
        }
      });
  }

  // ==================
  // CONFIG MODAL
  // ==================

  openConfigModal(partner: Partner): void {
    this.editingPartner = partner;
    this.editCommissionType = partner.commissionType;
    this.editCommissionValue = partner.commissionValue;
    this.editCommissionThreshold = partner.commissionThreshold;
    this.editValidationPeriodHours = partner.validationPeriodHours;
    this.showConfigModal = true;
    this.closeActions();
    this.cdr.markForCheck();
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
    this.editingPartner = null;
    this.cdr.markForCheck();
  }

  saveConfig(): void {
    if (this.isSavingConfig || !this.editingPartner) return;

    this.isSavingConfig = true;
    this.partnerService.updatePartnerConfig(this.editingPartner.id, {
      commissionType: this.editCommissionType,
      commissionValue: this.editCommissionValue,
      commissionThreshold: this.editCommissionThreshold,
      validationPeriodHours: this.editValidationPeriodHours
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.success('Configuração salva', 'Comissão atualizada com sucesso');
            this.showConfigModal = false;
            this.editingPartner = null;
            this.loadPartners();
          }
          this.isSavingConfig = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSavingConfig = false;
          const msg = err.error?.message || err.error?.error || 'Falha ao salvar configuração';
          this.notificationService.error('Erro', msg);
          this.cdr.markForCheck();
        }
      });
  }

  // ==================
  // WITHDRAWALS
  // ==================

  loadWithdrawals(): void {
    this.isLoadingWithdrawals = true;
    this.partnerService.listWithdrawals(this.withdrawalFilter || undefined, this.withdrawalsPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.withdrawals = res.data.withdrawals;
            this.withdrawalsTotal = res.data.total;
            this.withdrawalsTotalPages = res.data.totalPages;
          }
          this.isLoadingWithdrawals = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingWithdrawals = false;
          this.notificationService.error('Erro', 'Falha ao carregar saques');
          this.cdr.markForCheck();
        }
      });
  }

  setWithdrawalFilter(status: string): void {
    this.withdrawalFilter = status;
    this.withdrawalsPage = 1;
    this.loadWithdrawals();
  }

  goToWithdrawalsPage(page: number): void {
    if (page < 1 || page > this.withdrawalsTotalPages) return;
    this.withdrawalsPage = page;
    this.loadWithdrawals();
  }

  // ==================
  // PENDING COMMISSIONS
  // ==================

  loadPendingCommissions(): void {
    this.isLoadingPendingCommissions = true;
    this.partnerService.getPendingCommissions(this.pendingCommissionsPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.pendingCommissions = res.data.commissions;
            this.pendingCommissionsTotal = res.data.total;
            this.pendingCommissionsTotalPages = res.data.totalPages;
          }
          this.isLoadingPendingCommissions = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingPendingCommissions = false;
          this.cdr.markForCheck();
        }
      });
  }

  goToPendingCommissionsPage(page: number): void {
    if (page < 1 || page > this.pendingCommissionsTotalPages) return;
    this.pendingCommissionsPage = page;
    this.loadPendingCommissions();
  }

  // ==================
  // RANKING
  // ==================

  loadRanking(): void {
    this.isLoadingRanking = true;
    this.partnerService.getRanking(this.rankingPage, 20, this.rankingSortBy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.ranking = res.data.ranking;
            this.rankingTotal = res.data.total;
            this.rankingTotalPages = res.data.totalPages;
          }
          this.isLoadingRanking = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingRanking = false;
          this.cdr.markForCheck();
        }
      });
  }

  setRankingSortBy(sort: string): void {
    this.rankingSortBy = sort;
    this.rankingPage = 1;
    this.loadRanking();
  }

  goToRankingPage(page: number): void {
    if (page < 1 || page > this.rankingTotalPages) return;
    this.rankingPage = page;
    this.loadRanking();
  }

  // ==================
  // REVIEW MODAL
  // ==================

  openReviewModal(withdrawal: PartnerWithdrawal): void {
    this.reviewingWithdrawal = withdrawal;
    this.reviewStatus = 'approved';
    this.reviewNotes = '';
    this.showReviewModal = true;
    this.cdr.markForCheck();
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.reviewingWithdrawal = null;
    this.cdr.markForCheck();
  }

  submitReview(): void {
    if (this.isReviewing || !this.reviewingWithdrawal) return;

    this.isReviewing = true;
    this.partnerService.reviewWithdrawal(this.reviewingWithdrawal.id, {
      status: this.reviewStatus,
      notes: this.reviewNotes || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const label = this.reviewStatus === 'approved' ? 'aprovado' : 'rejeitado';
            this.notificationService.success('Sucesso', `Saque ${label} com sucesso`);
            this.showReviewModal = false;
            this.reviewingWithdrawal = null;
            this.loadWithdrawals();
            this.loadPartners();
            this.loadMetrics();
          }
          this.isReviewing = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isReviewing = false;
          const msg = err.error?.message || err.error?.error || 'Falha ao revisar saque';
          this.notificationService.error('Erro', msg);
          this.cdr.markForCheck();
        }
      });
  }

  // ==================
  // CONFIRM MODAL
  // ==================

  showConfirm(title: string, message: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.isConfirming = false;
    this.showConfirmModal = true;
    this.cdr.markForCheck();
  }

  executeConfirm(): void {
    if (this.confirmAction) {
      this.isConfirming = true;
      this.cdr.markForCheck();
      this.confirmAction();
    }
  }

  closeConfirm(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.isConfirming = false;
    this.cdr.markForCheck();
  }

  // ==================
  // EXPORT
  // ==================

  exportCSV(): void {
    const baseUrl = environment.apiUrl;
    const token = localStorage.getItem('admin_token');
    const url = `${baseUrl}/partners/admin/export`;

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'parceiros.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      this.notificationService.success('Exportado', 'Arquivo CSV baixado');
    })
    .catch(() => {
      this.notificationService.error('Erro', 'Falha ao exportar');
    });
  }

  // ==================
  // HELPERS
  // ==================

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      validated: 'Validada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      validated: 'status-validated',
      cancelled: 'status-rejected',
    };
    return classes[status] || '';
  }

  getPartnerStatusLabel(partner: Partner): string {
    return partner.isActive ? 'Ativo' : 'Bloqueado';
  }

  getPartnerStatusClass(partner: Partner): string {
    return partner.isActive ? 'badge-active' : 'badge-blocked';
  }

  getCommissionLabel(partner: Partner): string {
    return partner.commissionType === 'percentage'
      ? `${partner.commissionValue}%`
      : `R$ ${partner.commissionValue.toFixed(2)}`;
  }

  getTypeLabel(type: string): string {
    return type === 'percentage' ? 'RevShare' : 'CPA';
  }

  getLastActivityLabel(date: string | undefined): string {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  getPartnerLevel(partner: Partner | PartnerRanking): { label: string; class: string } {
    const earned = partner.totalCommissionsEarned || 0;
    if (earned >= 10000) return { label: 'VIP', class: 'level-vip' };
    if (earned >= 5000) return { label: 'Ouro', class: 'level-gold' };
    if (earned >= 1000) return { label: 'Prata', class: 'level-silver' };
    return { label: 'Bronze', class: 'level-bronze' };
  }

  getRankingMedal(position: number): string {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  }

  trackById(_: number, item: any): string {
    return item.id;
  }
}
