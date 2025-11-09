import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NotificationComponent } from './components/notification/notification.component';

// Directives
import { LazyLoadDirective } from './directives/lazy-load.directive';

// Pipes
import { CurrencyPipe } from './pipes/currency.pipe';
import { DateFormatPipe } from './pipes/date-format.pipe';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    
    // Componentes, Diretivas e Pipes Standalone
    LoadingSpinnerComponent,
    NotificationComponent,
    LazyLoadDirective,
    CurrencyPipe,
    DateFormatPipe
  ],
  exports: [
    // Angular modules
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    
    // Components
    LoadingSpinnerComponent,
    NotificationComponent,
    
    // Directives
    LazyLoadDirective,
    
    // Pipes
    CurrencyPipe,
    DateFormatPipe
  ]
})
export class SharedModule { }