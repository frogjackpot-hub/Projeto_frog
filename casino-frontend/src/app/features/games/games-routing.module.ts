import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FrogjackpotGameComponent } from './components/frogjackpot-game/frogjackpot-game';
import { GamesListComponent } from './components/games-list/games-list';
import { SlotMachineComponent } from './components/slot-machine/slot-machine';

const routes: Routes = [
  {
    path: '',
    component: GamesListComponent
  },
  {
    path: 'frogjackpot',
    component: FrogjackpotGameComponent
  },
  {
    path: 'slot',
    component: SlotMachineComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GamesRoutingModule { }
