import { Injectable } from '@angular/core';
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

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService) {
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

  getCurrentUser(): Observable<User | null> {
    if (this.currentUserSubject.value) {
      return of(this.currentUserSubject.value);
    }

    return this.apiService.get<{ user: User }>('auth/profile').pipe(
      map(response => {
        if (response.success && response.data) {
          const user = response.data.user;
          this.currentUserSubject.next(user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          return user;
        }
        return null;
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  private setAuthData(authData: AuthResponse['data']): void {
    const { user, tokens } = authData;
    
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