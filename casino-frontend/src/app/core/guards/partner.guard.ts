import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { PartnerService } from '../services/partner.service';

@Injectable({
  providedIn: 'root'
})
export class PartnerGuard implements CanActivate {
  constructor(
    private partnerService: PartnerService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.partnerService.getMyProfile().pipe(
      take(1),
      map(response => {
        if (response.success && response.data?.partner) {
          return true;
        }
        this.router.navigate(['/dashboard']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/dashboard']);
        return of(false);
      })
    );
  }
}
