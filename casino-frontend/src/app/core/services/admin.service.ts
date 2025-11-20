import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response.model';
import { User } from '../../core/models/user.model';
import { ApiService } from '../../core/services/api.service';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AdminStats {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalBets: number;
    totalWins: number;
    totalDeposits: number;
    totalWithdrawals: number;
    profit: number;
    casinoBalance: number;
    betsCount: number;
  };
  growth: any;
  recentTransactions: any[];
}

export interface GameStats {
  id: string;
  name: string;
  type: string;
  rtp: number;
  totalBets: number;
  totalWagered: number;
  totalWins: number;
  profit: number;
  winRate: string;
}

export interface UserDetails {
  user: any;
  recentTransactions: any[];
}

export interface CasinoConfig {
  id: number;
  key: string;
  value: any;
  description: string;
  updatedAt: string;
}

export interface Bonus {
  id: string;
  code: string;
  type: 'deposit' | 'no_deposit' | 'cashback' | 'free_spins';
  value: number;
  minDeposit: number;
  maxBonus: number;
  wagerRequirement: number;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminUsername: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly ADMIN_TOKEN_KEY = 'admin_token';
  private readonly ADMIN_USER_KEY = 'admin_user';
  
  private currentAdminSubject = new BehaviorSubject<User | null>(this.getStoredAdmin());
  private isAdminAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasAdminToken());

  public currentAdmin$ = this.currentAdminSubject.asObservable();
  public isAdminAuthenticated$ = this.isAdminAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService) {}

  /**
   * Verifica se existe token de admin no localStorage
   */
  private hasAdminToken(): boolean {
    return !!localStorage.getItem(this.ADMIN_TOKEN_KEY);
  }

  /**
   * Recupera dados do admin do localStorage
   */
  private getStoredAdmin(): User | null {
    const adminData = localStorage.getItem(this.ADMIN_USER_KEY);
    if (adminData) {
      try {
        return JSON.parse(adminData);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Retorna o token de admin atual
   */
  getAdminToken(): string | null {
    return localStorage.getItem(this.ADMIN_TOKEN_KEY);
  }

  /**
   * Login de administrador
   */
  login(credentials: AdminLoginRequest): Observable<ApiResponse<AdminLoginResponse>> {
    return this.apiService.post<AdminLoginResponse>('/admin/login', credentials).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Limpar tokens de usuário regular se existirem
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          
          // Armazenar token e dados do admin
          localStorage.setItem(this.ADMIN_TOKEN_KEY, response.data.accessToken);
          localStorage.setItem(this.ADMIN_USER_KEY, JSON.stringify(response.data.user));
          
          // Atualizar subjects
          this.currentAdminSubject.next(response.data.user);
          this.isAdminAuthenticatedSubject.next(true);
        }
      })
    );
  }

  /**
   * Logout de administrador
   */
  logout(): Observable<ApiResponse<any>> {
    return this.apiService.post('/admin/logout', {}).pipe(
      tap(() => {
        this.clearAdminData();
      })
    );
  }

  /**
   * Limpar dados de autenticação do admin
   */
  private clearAdminData(): void {
    // Limpar tokens de admin
    localStorage.removeItem(this.ADMIN_TOKEN_KEY);
    localStorage.removeItem(this.ADMIN_USER_KEY);
    
    // Também limpar tokens de usuário regular para evitar confusão
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    
    this.currentAdminSubject.next(null);
    this.isAdminAuthenticatedSubject.next(false);
  }

  /**
   * Obter perfil do administrador
   */
  getProfile(): Observable<ApiResponse<User>> {
    return this.apiService.get<User>('/admin/profile');
  }

  /**
   * Listar todos os usuários (admin only)
   */
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.apiService.get<User[]>('/admin/users');
  }

  /**
   * Obter estatísticas do sistema (admin only)
   */
  getStats(period: string = 'today'): Observable<ApiResponse<AdminStats>> {
    return this.apiService.get<AdminStats>(`/admin/stats?period=${period}`);
  }

  // ========== GESTÃO DE USUÁRIOS ==========

  /**
   * Obter detalhes de um usuário
   */
  getUserById(id: string): Observable<ApiResponse<UserDetails>> {
    return this.apiService.get<UserDetails>(`/admin/users/${id}`);
  }

  /**
   * Atualizar usuário
   */
  updateUser(id: string, updateData: any): Observable<ApiResponse<User>> {
    return this.apiService.put<User>(`/admin/users/${id}`, updateData);
  }

  /**
   * Adicionar saldo ao usuário
   */
  addBalance(id: string, amount: number, description?: string): Observable<ApiResponse<any>> {
    return this.apiService.post(`/admin/users/${id}/add-balance`, { amount, description });
  }

  /**
   * Remover saldo do usuário
   */
  removeBalance(id: string, amount: number, description?: string): Observable<ApiResponse<any>> {
    return this.apiService.post(`/admin/users/${id}/remove-balance`, { amount, description });
  }

  /**
   * Bloquear/Desbloquear usuário
   */
  toggleUserStatus(id: string): Observable<ApiResponse<any>> {
    return this.apiService.patch(`/admin/users/${id}/toggle-status`, {});
  }

  /**
   * Deletar usuário
   */
  deleteUser(id: string): Observable<ApiResponse<any>> {
    return this.apiService.delete(`/admin/users/${id}`);
  }

  // ========== GESTÃO DE JOGOS ==========

  /**
   * Obter estatísticas de jogos
   */
  getGameStats(period: string = 'all'): Observable<ApiResponse<GameStats[]>> {
    return this.apiService.get<GameStats[]>(`/admin/games/stats?period=${period}`);
  }

  /**
   * Atualizar configurações do jogo
   */
  updateGame(id: string, updateData: any): Observable<ApiResponse<any>> {
    return this.apiService.put(`/admin/games/${id}`, updateData);
  }

  // ========== GESTÃO DE TRANSAÇÕES ==========

  /**
   * Listar todas as transações com filtros
   */
  getAllTransactions(filters: any = {}): Observable<ApiResponse<any>> {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key].toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/transactions?${queryString}` : '/admin/transactions';
    
    return this.apiService.get(endpoint);
  }

  /**
   * Aprovar/Rejeitar transação
   */
  updateTransactionStatus(id: string, status: 'approved' | 'rejected'): Observable<ApiResponse<any>> {
    return this.apiService.patch(`/admin/transactions/${id}/status`, { status });
  }

  // ========== CONFIGURAÇÕES ==========

  /**
   * Obter configurações do cassino
   */
  getConfig(): Observable<ApiResponse<CasinoConfig[]>> {
    return this.apiService.get<CasinoConfig[]>('/admin/config');
  }

  /**
   * Atualizar configurações do cassino
   */
  updateConfig(configs: any[]): Observable<ApiResponse<CasinoConfig[]>> {
    return this.apiService.put<CasinoConfig[]>('/admin/config', { configs });
  }

  // ========== BÔNUS ==========

  /**
   * Listar bônus
   */
  getBonuses(includeInactive: boolean = false): Observable<ApiResponse<Bonus[]>> {
    return this.apiService.get<Bonus[]>(`/admin/bonuses?includeInactive=${includeInactive}`);
  }

  /**
   * Criar bônus
   */
  createBonus(bonusData: any): Observable<ApiResponse<Bonus>> {
    return this.apiService.post<Bonus>('/admin/bonuses', bonusData);
  }

  /**
   * Atualizar bônus
   */
  updateBonus(id: string, bonusData: any): Observable<ApiResponse<Bonus>> {
    return this.apiService.put<Bonus>(`/admin/bonuses/${id}`, bonusData);
  }

  /**
   * Deletar bônus
   */
  deleteBonus(id: string): Observable<ApiResponse<any>> {
    return this.apiService.delete(`/admin/bonuses/${id}`);
  }

  // ========== AUDITORIA ==========

  /**
   * Obter logs de auditoria
   */
  getAuditLogs(filters: any = {}): Observable<ApiResponse<{ logs: AuditLog[], pagination: any }>> {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key].toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/audit-logs?${queryString}` : '/admin/audit-logs';
    
    return this.apiService.get(endpoint);
  }

  /**
   * Verifica se o usuário atual é admin
   */
  get isAdmin(): boolean {
    const admin = this.currentAdminSubject.value;
    return admin?.role === 'admin' && this.hasAdminToken();
  }

  /**
   * Retorna o admin atual
   */
  get currentAdmin(): User | null {
    return this.currentAdminSubject.value;
  }
}
