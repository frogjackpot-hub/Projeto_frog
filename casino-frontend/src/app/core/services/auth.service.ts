import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private statusCheckInterval: any = null;

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.checkAuthStatus();
    this.setupStorageListener();
    // Verificação periódica desabilitada - confiar apenas no interceptor
    // this.startStatusCheck();
  }

  /**
   * Configurar listener para sincronizar autenticação entre abas
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      // Detectar mudanças no token de acesso
      if (event.key === 'accessToken' || event.key === 'admin_token') {
        // Se o token foi removido ou alterado, verificar o estado
        this.checkAuthStatus();
        
        // Se foi login de admin, deslogar usuário comum
        if (event.key === 'admin_token' && event.newValue) {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }
        
        // Se o token de usuário foi removido, deslogar
        if (event.key === 'accessToken' && !event.newValue) {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }
      }
      
      // Detectar evento customizado de logout
      if (event.key === 'auth_event') {
        const eventData = event.newValue ? JSON.parse(event.newValue) : null;
        
        if (eventData?.type === 'logout') {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }
        
        if (eventData?.type === 'admin_login') {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }
      }
      
      // Detectar quando usuário é bloqueado pelo admin
      if (event.key === 'user_blocked') {
        const blockedUserId = event.newValue;
        const currentUser = this.currentUserValue;
        
        // Se o ID corresponde ao usuário atual, bloquear
        if (currentUser && currentUser.id === blockedUserId) {
          console.log('Usuário foi bloqueado pelo administrador');
          this.handleBlockedUser();
        }
      }
    });
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('currentUser');

    if (token && userData && !this.isTokenExpired()) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.log('⚠️ Erro ao validar dados do usuário - Limpando sessão');
        this.clearAuthData();
      }
    } else {
      // Token inválido ou ausente
      if (token || userData) {
        console.log('⚠️ Token expirado ou inválido - Limpando sessão');
      }
      this.clearAuthData();
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('auth/login', credentials).pipe(
      map(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
          return {
            success: true,
            message: response.message || 'Login realizado com sucesso',
            data: response.data
          };
        }
        throw new Error(response.message || 'Erro ao realizar login');
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.apiService.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('auth/register', userData).pipe(
      map(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
          return {
            success: true,
            message: response.message || 'Registro realizado com sucesso',
            data: response.data
          };
        }
        throw new Error(response.message || 'Erro ao realizar registro');
      }),
      catchError(error => {
        console.error('Register error:', error);
        throw error;
      })
    );
  }

  logout(): void {
    const token = localStorage.getItem('accessToken');
    
    // Limpar dados ANTES de qualquer navegação para evitar conflito com NoAuthGuard
    this.clearAuthData();
    
    if (token) {
      // Notificar o servidor sobre o logout (fire-and-forget)
      this.apiService.post('auth/logout', {}).subscribe({
        next: () => console.log('Logout realizado com sucesso'),
        error: (error) => console.error('Erro no logout:', error)
      });
    }
  }

  refreshToken(): Observable<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return of(false);
    }

    return this.apiService.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('auth/refresh', { refreshToken }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
          return true;
        }
        return false;
      }),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  getCurrentUser(forceRefresh: boolean = false): Observable<User | null> {
    // Se não forçar refresh e já tem usuário, retorna o cached
    if (!forceRefresh && this.currentUserSubject.value) {
      return of(this.currentUserSubject.value);
    }

    // Busca os dados atualizados do servidor
    return this.apiService.get<{ user: User }>('auth/profile').pipe(
      map(response => {
        if (response.success && response.data) {
          const user = response.data.user;
          
          // Verificar se o usuário foi bloqueado
          if (!user.isActive) {
            this.handleBlockedUser();
            return null;
          }
          
          this.currentUserSubject.next(user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          return user;
        }
        return null;
      }),
      catchError((error) => {
        // Verificar se o erro é por conta bloqueada
        if (error?.error?.message?.includes('bloqueado') || error?.error?.message?.includes('bloqueada')) {
          this.handleBlockedUser();
        } else {
          this.logout();
        }
        return of(null);
      })
    );
  }

  /**
   * Iniciar verificação periódica de status do usuário
   * Verifica a cada 30 segundos se o usuário ainda está ativo
   */
  private startStatusCheck(): void {
    // Limpar qualquer verificação anterior
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    
    // Verificar a cada 30 segundos
    this.statusCheckInterval = setInterval(() => {
      const currentUser = this.currentUserValue;
      const token = localStorage.getItem('accessToken');
      
      // Só verificar se houver usuário logado
      if (currentUser && token && !this.isTokenExpired()) {
        this.checkUserStatus();
      }
    }, 30000); // 30 segundos
  }
  
  /**
   * Verificar status do usuário no servidor
   */
  private checkUserStatus(): void {
    this.apiService.get<{ user: User }>('auth/profile').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const user = response.data.user;
          
          // Verificar se o usuário foi bloqueado
          if (!user.isActive) {
            console.log('Usuário foi bloqueado - deslogando automaticamente');
            this.handleBlockedUser();
          }
        }
      },
      error: (error) => {
        // Se houver erro de autenticação, pode ser que o usuário foi bloqueado
        if (error?.status === 401 || error?.status === 403) {
          const errorMessage = error?.error?.message || '';
          if (errorMessage.includes('bloqueado') || errorMessage.includes('bloqueada')) {
            this.handleBlockedUser();
          }
        }
      }
    });
  }

  /**
   * Tratar usuário bloqueado
   */
  private handleBlockedUser(): void {
    console.log('🚫 BLOQUEIO DETECTADO - Redirecionando para login');
    
    // Parar verificação de status
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    // Limpar dados de autenticação IMEDIATAMENTE
    this.clearAuthData();
    
    // Marcar que o usuário foi bloqueado
    localStorage.setItem('user_blocked_reason', 'Sua conta foi bloqueada pelo administrador.');
    
    // Forçar redirecionamento IMEDIATO para login
    console.log('🔄 Redirecionando para tela de login...');
    window.location.href = '/auth/login?blocked=true';
  }

  /**
   * Limpa dados de autenticação sem fazer logout no servidor
   * (usado quando usuário já foi deslogado pelo backend)
   */
  public clearAuthDataOnly(): void {
    this.clearAuthData();
  }

  /**
   * Atualiza o saldo localmente de forma IMEDIATA, sem requisição HTTP.
   * Use isso logo após receber o novo saldo do servidor para atualizar
   * o nav e qualquer componente que escute currentUser$ em tempo real.
   */
  updateBalanceLocally(newBalance: number): void {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return;

    const updatedUser: User = { ...currentUser, balance: newBalance };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    // NgZone.run() garante que o Angular detecta a mudança IMEDIATAMENTE,
    // mesmo que a chamada venha de fora do ciclo de detecção (async/await, Promise)
    this.ngZone.run(() => {
      this.currentUserSubject.next(updatedUser);
    });
  }

  /**
   * Força atualização do usuário (útil após operações que alteram o saldo)
   */
  refreshUserData(): Observable<User | null> {
    return this.getCurrentUser(true);
  }

  private setAuthData(authData: AuthResponse['data']): void {
    const { user, tokens } = authData;
    
    // Limpar tokens de admin se existirem
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Notificar outras abas sobre o login
    this.notifyOtherTabs('login');
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    
    // Iniciar verificação de status
    this.startStatusCheck();
  }

  private clearAuthData(): void {
    // Parar verificação de status
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    
    // Notificar outras abas sobre o logout
    this.notifyOtherTabs('logout');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Notificar outras abas sobre mudanças de autenticação
   */
  private notifyOtherTabs(type: 'login' | 'logout'): void {
    const event = {
      type,
      timestamp: Date.now()
    };
    localStorage.setItem('auth_event', JSON.stringify(event));
    // Remover o evento após um breve período para permitir nova detecção
    setTimeout(() => localStorage.removeItem('auth_event'), 100);
  }

  isTokenExpired(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}