import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositComponent } from './components/deposit/deposit';
import { TransactionsComponent } from './components/transactions/transactions';
import { WalletOverview } from './components/wallet-overview/wallet-overview';
import { WithdrawComponent } from './components/withdraw/withdraw';

const routes: Routes = [
  {
    path: '',
    component: WalletOverview
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
    WalletOverview,
    DepositComponent,
    WithdrawComponent,
    TransactionsComponent
  ]
})
export class WalletModule { }
