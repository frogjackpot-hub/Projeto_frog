import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { LoadingService } from './core/services/loading.service';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { NotificationComponent } from './shared/components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    AsyncPipe,
    NotificationComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal(environment.appName);
  protected isLoading$ = inject(LoadingService).loading$;
  
  constructor() {
    console.log('Ambiente:', environment.production ? 'Produção' : 'Desenvolvimento');
    console.log('API URL:', environment.apiUrl);
  }
}