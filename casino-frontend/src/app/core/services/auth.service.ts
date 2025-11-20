import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BlockedUserService } from '../../shared/services/blocked-user.service';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private blockedUserService: BlockedUserService,
    private router: Router
  ) {
    this.checkAuthStatus();
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
        this.clearAuthData();
      }
    } else {
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
    
    if (token) {
      // Só chama a API se houver um token
      this.apiService.post('auth/logout', {}).subscribe({
        next: () => console.log('Logout realizado com sucesso'),
        error: (error) => console.error('Erro no logout:', error),
        complete: () => this.clearAuthData()
      });
    } else {
      this.clearAuthData();
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
   * Tratar usuário bloqueado
   */
  private handleBlockedUser(): void {
    // Mostrar modal PRIMEIRO
    this.blockedUserService.showBlockedModal();
    
    // Limpar dados de autenticação DEPOIS (após 1 segundo)
    setTimeout(() => {
      this.clearAuthData();
    }, 1000);
  }

  /**
   * Limpa dados de autenticação sem fazer logout no servidor
   * (usado quando usuário já foi deslogado pelo backend)
   */
  public clearAuthDataOnly(): void {
    this.clearAuthData();
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
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
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