import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositComponent } from './components/deposit/deposit';
import { TransactionsComponent } from './components/transactions/transactions';
import { WithdrawComponent } from './components/withdraw/withdraw';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'deposit',
    pathMatch: 'full'
  },
  {
    path: 'deposit',
    component: DepositComponent
  },
  {
    path: 'withdraw',
    component: WithdrawComponent
  },
  {
    path: 'transactions',
    component: TransactionsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DepositComponent,
    WithdrawComponent,
    TransactionsComponent
  ]
})
export class WalletModule { }
