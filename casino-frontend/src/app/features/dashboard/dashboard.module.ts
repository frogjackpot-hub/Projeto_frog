import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home';
import { Statistics } from './components/statistics/statistics';
import { UserProfile } from './components/user-profile/user-profile';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: DashboardHomeComponent
  },
  {
    path: 'profile',
    component: UserProfile
  },
  {
    path: 'statistics',
    component: Statistics
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DashboardHomeComponent,
    Statistics,
    UserProfile
  ]
})
export class DashboardModule { }