import { Routes } from '@angular/router';
import { AdminGuard } from '../../core/guards/admin.guard';
import { AdminAuditComponent } from './components/admin-audit/admin-audit';
import { AdminConfigComponent } from './components/admin-config/admin-config';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { AdminGamesComponent } from './components/admin-games/admin-games';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout';
import { AdminLoginComponent } from './components/admin-login/admin-login';
import { AdminUsersComponent } from './components/admin-users/admin-users';

export const adminRoutes: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'users',
        component: AdminUsersComponent
      },
      {
        path: 'games',
        component: AdminGamesComponent
      },
      {
        path: 'config',
        component: AdminConfigComponent
      },
      {
        path: 'audit',
        component: AdminAuditComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
