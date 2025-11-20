import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AdminService } from '../services/admin.service';

/**
 * Guard para proteger rotas administrativas
 * Redireciona para login de admin se não estiver autenticado
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.adminService.isAdminAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated && this.adminService.isAdmin) {
          return true;
        }

        // Armazenar URL de retorno
        this.router.navigate(['/admin/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      })
    );
  }
}
