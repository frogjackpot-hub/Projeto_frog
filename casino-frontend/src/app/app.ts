import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { LoadingService } from './core/services/loading.service';
import { BlockedUserModalComponent } from './shared/components/blocked-user-modal/blocked-user-modal.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { BlockedUserService } from './shared/services/blocked-user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    AsyncPipe,
    CommonModule,
    NotificationComponent,
    LoadingSpinnerComponent,
    BlockedUserModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal(environment.appName);
  protected isLoading$ = inject(LoadingService).loading$;
  protected showBlockedModal$ = inject(BlockedUserService).showModal$;
  
  constructor() {
    console.log('Ambiente:', environment.production ? 'Produção' : 'Desenvolvimento');
    console.log('API URL:', environment.apiUrl);
  }
}