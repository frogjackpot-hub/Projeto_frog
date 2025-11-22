import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { AdminService } from './core/services/admin.service';
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { NotificationComponent } from './shared/components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    AsyncPipe,
    CommonModule,
    NotificationComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly title = signal(environment.appName);
  protected isLoading$ = inject(LoadingService).loading$;
  
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private storageListener: ((event: StorageEvent) => void) | null = null;
  
  constructor() {
    console.log('Ambiente:', environment.production ? 'Produção' : 'Desenvolvimento');
    console.log('API URL:', environment.apiUrl);
    
    // Configurar sincronização global entre abas
    this.setupCrossTabSync();
  }

  /**
   * Configurar sincronização de autenticação entre abas do navegador
   * Garante que mudanças em uma aba sejam refletidas em todas as outras
   */
  private setupCrossTabSync(): void {
    this.storageListener = (event: StorageEvent) => {
      // Ignorar eventos da mesma aba
      if (!event.storageArea) return;

      // Detectar quando admin faz login (deve deslogar usuário comum em outras abas)
      if (event.key === 'admin_token' && event.newValue && !event.oldValue) {
        console.log('Admin login detectado em outra aba - deslogando usuário comum');
        
        // Se estiver logado como usuário comum, deslogar
        if (this.authService.isAuthenticated && !this.adminService.isAdmin) {
          this.authService.clearAuthDataOnly();
          this.router.navigate(['/auth/login']);
        }
      }

      // Detectar quando usuário comum faz login (deve deslogar admin em outras abas)
      if (event.key === 'accessToken' && event.newValue && !event.oldValue) {
        console.log('Login de usuário detectado em outra aba - deslogando admin');
        
        // Se estiver logado como admin, limpar dados
        if (this.adminService.isAdmin) {
          this.router.navigate(['/admin/login']);
        }
      }

      // Detectar logout em qualquer conta
      if ((event.key === 'accessToken' || event.key === 'admin_token') && !event.newValue && event.oldValue) {
        console.log('Logout detectado em outra aba');
        
        // Recarregar a página atual para refletir o logout
        window.location.reload();
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    // Remover listener ao destruir componente
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }
}