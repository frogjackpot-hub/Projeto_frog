import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError(error => {
        if (error.status === 401) {
          // Token expirado, tentar renovar
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