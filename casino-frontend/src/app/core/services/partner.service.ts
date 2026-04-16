import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import {
    CreatePartnerRequest,
    PaginatedCommissions,
    PaginatedPartners,
    PaginatedRanking,
    PaginatedReferredUsers,
    PaginatedWithdrawals,
    Partner,
    PartnerAdminMetrics,
    PartnerProfileResponse,
    UpdatePartnerConfigRequest,
    ValidateCodeResponse,
    WithdrawalReviewRequest
} from '../models/partner.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {

  constructor(private apiService: ApiService) {}

  // ========================
  // ENDPOINTS PÚBLICOS
  // ========================

  /** Validar código de indicação (usado na tela de cadastro) */
  validateCode(code: string): Observable<ApiResponse<ValidateCodeResponse>> {
    return this.apiService.get<ValidateCodeResponse>(`partners/validate-code/${code}`);
  }

  // ========================
  // ENDPOINTS DO PARCEIRO
  // ========================

  /** Obter perfil + stats + indicados do parceiro logado */
  getMyProfile(): Observable<ApiResponse<PartnerProfileResponse>> {
    return this.apiService.get<PartnerProfileResponse>('partners/me');
  }

  /** Listar usuários indicados pelo parceiro logado */
  getMyReferredUsers(page = 1, limit = 20): Observable<ApiResponse<PaginatedReferredUsers>> {
    return this.apiService.get<PaginatedReferredUsers>('partners/me/referred-users', { page, limit });
  }

  /** Histórico de comissões do parceiro logado */
  getMyCommissions(page = 1, limit = 20, status?: string): Observable<ApiResponse<PaginatedCommissions>> {
    const params: any = { page, limit };
    if (status) params.status = status;
    return this.apiService.get<PaginatedCommissions>('partners/me/commissions', params);
  }

  /** Solicitar saque de comissões */
  requestWithdrawal(amount: number): Observable<ApiResponse<{ withdrawalId: string; amount: number }>> {
    return this.apiService.post<{ withdrawalId: string; amount: number }>('partners/me/withdraw', { amount });
  }

  /** Histórico de saques do parceiro logado */
  getMyWithdrawals(page = 1, limit = 20): Observable<ApiResponse<PaginatedWithdrawals>> {
    return this.apiService.get<PaginatedWithdrawals>('partners/me/withdrawals', { page, limit });
  }

  // ========================
  // ENDPOINTS DO ADMIN
  // ========================

  /** Transformar usuário em parceiro */
  createPartner(data: CreatePartnerRequest): Observable<ApiResponse<{ partner: Partner }>> {
    return this.apiService.post<{ partner: Partner }>('partners/admin/create', data);
  }

  /** Listar todos os parceiros */
  listPartners(page = 1, limit = 20, filters?: {
    active?: boolean;
    search?: string;
    status?: string;
    commissionType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<ApiResponse<PaginatedPartners>> {
    const params: any = { page, limit, ...filters };
    // Limpar undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    return this.apiService.get<PaginatedPartners>('partners/admin/list', params);
  }

  /** Detalhes de um parceiro específico */
  getPartnerDetails(partnerId: string): Observable<ApiResponse<PartnerProfileResponse>> {
    return this.apiService.get<PartnerProfileResponse>(`partners/admin/${partnerId}`);
  }

  /** Atualizar configuração de comissão de um parceiro */
  updatePartnerConfig(partnerId: string, data: UpdatePartnerConfigRequest): Observable<ApiResponse<{ partner: Partner }>> {
    return this.apiService.put<{ partner: Partner }>(`partners/admin/${partnerId}/config`, data);
  }

  /** Ativar/desativar parceiro */
  togglePartner(partnerId: string, isActive: boolean): Observable<ApiResponse<{ partner: Partner }>> {
    return this.apiService.patch<{ partner: Partner }>(`partners/admin/${partnerId}/toggle`, { isActive });
  }

  /** Listar solicitações de saque (admin) */
  listWithdrawals(status?: string, page = 1, limit = 20): Observable<ApiResponse<PaginatedWithdrawals>> {
    const params: any = { page, limit };
    if (status) params.status = status;
    return this.apiService.get<PaginatedWithdrawals>('partners/admin/withdrawals', params);
  }

  /** Aprovar/rejeitar solicitação de saque */
  reviewWithdrawal(withdrawalId: string, data: WithdrawalReviewRequest): Observable<ApiResponse<any>> {
    return this.apiService.post<any>(`partners/admin/withdrawals/${withdrawalId}/review`, data);
  }

  /** Validar comissões pendentes (trigger manual) */
  validatePendingCommissions(): Observable<ApiResponse<{ validatedCount: number }>> {
    return this.apiService.post<{ validatedCount: number }>('partners/admin/validate-commissions', {});
  }

  /** Métricas gerais do sistema de parceiros */
  getAdminMetrics(): Observable<ApiResponse<PartnerAdminMetrics>> {
    return this.apiService.get<PartnerAdminMetrics>('partners/admin/metrics');
  }

  /** Ranking de parceiros */
  getRanking(page = 1, limit = 20, sortBy?: string): Observable<ApiResponse<PaginatedRanking>> {
    const params: any = { page, limit };
    if (sortBy) params.sortBy = sortBy;
    return this.apiService.get<PaginatedRanking>('partners/admin/ranking', params);
  }

  /** Comissões pendentes de todos os parceiros */
  getPendingCommissions(page = 1, limit = 20): Observable<ApiResponse<PaginatedCommissions>> {
    return this.apiService.get<PaginatedCommissions>('partners/admin/pending-commissions', { page, limit });
  }

  /** Regenerar código de indicação */
  regenerateCode(partnerId: string): Observable<ApiResponse<{ partner: Partner }>> {
    return this.apiService.post<{ partner: Partner }>(`partners/admin/${partnerId}/regenerate-code`, {});
  }

  /** Excluir parceiro */
  deletePartner(partnerId: string): Observable<ApiResponse<void>> {
    return this.apiService.delete<void>(`partners/admin/${partnerId}`);
  }

  /** Comissões de um parceiro específico (admin) */
  getPartnerCommissions(partnerId: string, page = 1, limit = 20): Observable<ApiResponse<PaginatedCommissions>> {
    return this.apiService.get<PaginatedCommissions>(`partners/admin/${partnerId}/commissions`, { page, limit });
  }

  /** Usuários indicados de um parceiro específico (admin) */
  getPartnerReferredUsers(partnerId: string, page = 1, limit = 20): Observable<ApiResponse<PaginatedReferredUsers>> {
    return this.apiService.get<PaginatedReferredUsers>(`partners/admin/${partnerId}/referred-users`, { page, limit });
  }

  /** URL de exportação CSV */
  getExportUrl(): string {
    return 'partners/admin/export';
  }
}
