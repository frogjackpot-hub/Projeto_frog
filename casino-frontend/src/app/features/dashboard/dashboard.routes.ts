import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared-module';

// Importar componentes standalone
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';
import { Statistics } from './components/statistics/statistics';
import { UserProfile } from './components/user-profile/user-profile';

const routes: Routes = [
  {
    path: '',
    component: DashboardHomeComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    SharedModule,
    
    // Componentes standalone
    DashboardHomeComponent,
    UserProfile,
    Statistics,
    QuickActionsComponent
  ]
})
export class DashboardModule { }