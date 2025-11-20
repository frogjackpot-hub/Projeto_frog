import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BlockedUserService } from '../../shared/services/blocked-user.service';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private blockedUserService: BlockedUserService
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
        // Verificar se o usuário foi bloqueado (403 com code USER_BLOCKED)
        if (error.status === 403 && error.error?.code === 'USER_BLOCKED') {
          // Limpar autenticação
          this.authService.logout();
          
          // Mostrar modal de bloqueio
          this.blockedUserService.showBlockedModal();
          
          // Redirecionar para login após delay
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
          
          return throwError(() => error);
        }
        
        if (error.status === 401) {
          // Verificar se é rota admin
          if (req.url.includes('/admin/')) {
            // Redirecionar para login admin
            this.router.navigate(['/admin/login']);
            return throwError(() => error);
          }

          // Token expirado, tentar renovar (usuário regular)
          if (this.authService.isTokenExpired()) {
            return this.authService.refreshToken().pipe(
              switchMap(success => {
                if (success) {
                  // Reenviar a requisição original com o novo token
                  const token = localStorage.getItem('accessToken');
                  const authReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${token}`
                    }
                  });
                  return next.handle(authReq);
                } else {
                  // Falha ao renovar token, redirecionar para login
                  this.authService.logout();
                  this.router.navigate(['/auth/login']);
                  return throwError(() => error);
                }
              })
            );
          }
        }
        return throwError(() => error);
      })
    );
  }
}