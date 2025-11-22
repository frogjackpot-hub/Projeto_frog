import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  // Rota raiz - redireciona para login se não autenticado
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  
  // Rotas de autenticação (sem autenticação necessária)
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [NoAuthGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      }
    ]
  },
  
  // Rotas administrativas
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  
  // Rotas principais (requerem autenticação)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'games',
        loadChildren: () => import('./features/games/games.module').then(m => m.GamesModule)
      },
      {
        path: 'wallet',
        loadChildren: () => import('./features/wallet/wallet.module').then(m => m.WalletModule)
      }
    ]
  },
  
  // Rota 404
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];