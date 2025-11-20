import { Routes } from '@angular/router';
import { AdminGuard } from '../../core/guards/admin.guard';
import { AdminAuditComponent } from './components/admin-audit/admin-audit';
import { AdminConfigComponent } from './components/admin-config/admin-config';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { AdminGamesComponent } from './components/admin-games/admin-games';
import { AdminLoginComponent } from './components/admin-login/admin-login';
import { AdminUsersComponent } from './components/admin-users/admin-users';

export const adminRoutes: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'users',
    component: AdminUsersComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'games',
    component: AdminGamesComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'config',
    component: AdminConfigComponent,
    canActivate: [AdminGuard]
  },
  {
    path: 'audit',
    component: AdminAuditComponent,
    canActivate: [AdminGuard]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
