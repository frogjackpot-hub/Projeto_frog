import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerCommissionsComponent } from './components/partner-commissions/partner-commissions';
import { PartnerDashboardComponent } from './components/partner-dashboard/partner-dashboard';
import { PartnerReferredComponent } from './components/partner-referred/partner-referred';
import { PartnerWithdrawalsComponent } from './components/partner-withdrawals/partner-withdrawals';

const routes: Routes = [
  {
    path: '',
    component: PartnerDashboardComponent
  },
  {
    path: 'referred',
    component: PartnerReferredComponent
  },
  {
    path: 'commissions',
    component: PartnerCommissionsComponent
  },
  {
    path: 'withdrawals',
    component: PartnerWithdrawalsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    PartnerDashboardComponent,
    PartnerReferredComponent,
    PartnerCommissionsComponent,
    PartnerWithdrawalsComponent
  ]
})
export class PartnerModule { }
