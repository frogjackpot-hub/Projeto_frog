import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Adicionar token apropriado baseado no tipo de requisição
    if (req.url.includes('/admin/')) {
      // Requisições admin usam token de admin
      const adminToken = this.adminService.getAdminToken();
      if (adminToken) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${adminToken}`
          }
        });
      }
    } else {
      // Requisições regulares usam token de usuário regular
      const token = localStorage.getItem('accessToken');
      if (token) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }

    return next.handle(req).pipe(
      catchError(error => {
        console.log('HTTP Error interceptado:', error.status, error.error);
        
        // Verificar se o usuário foi bloqueado (403 com code USER_BLOCKED ou mensagem de bloqueio)
        const isBlocked = error.status === 403 && 
          (error.error?.code === 'USER_BLOCKED' || 
           error.error?.message?.includes('bloqueada') ||
           error.error?.message?.includes('bloqueado') ||
           error.error?.error?.includes('bloqueada') ||
           error.error?.error?.includes('bloqueado'));
        
        if (isBlocked) {
          console.log('❌ Usuário BLOQUEADO detectado - Redirecionando para login');
          
          // Se o bloqueio foi detectado na tela de login, não redirecionar
          // O componente de login já trata isso diretamente
          if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
            return throwError(() => error);
          }
          
          // Limpar IMEDIATAMENTE os dados de autenticação
          this.authService.clearAuthDataOnly();
          
          // Marcar que o usuário foi bloqueado
          localStorage.setItem('user_blocked_reason', 'Sua conta foi bloqueada pelo administrador.');
          
          // Redirecionar IMEDIATAMENTE para login com parâmetro de bloqueio
          window.location.href = '/auth/login?blocked=true';
          
          return throwError(() => error);
        }
        
        if (error.status === 401) {
          console.log('⛔ 401 DETECTADO - Limpando sessão e redirecionando...');
          
          // Limpar dados de autenticação
          this.authService.clearAuthDataOnly();
          
          // Verificar se é rota admin
          if (req.url.includes('/admin/')) {
            console.log('→ Redirecionando para /admin/login');
            setTimeout(() => window.location.href = '/admin/login', 0);
            return throwError(() => error);
          }
          
          // Para usuário comum - REDIRECIONAR IMEDIATAMENTE
          console.log('→ Redirecionando para /auth/login');
          setTimeout(() => window.location.href = '/auth/login', 0);
          return throwError(() => error);
        }
        
        return throwError(() => error);
      })
    );
  }
}