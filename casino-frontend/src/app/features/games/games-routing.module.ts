import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FrogjackpotGameComponent } from './components/frogjackpot-game/frogjackpot-game';
import { GamesListComponent } from './components/games-list/games-list';

const routes: Routes = [
  {
    path: '',
    component: GamesListComponent
  },
  {
    path: 'frogjackpot',
    component: FrogjackpotGameComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GamesRoutingModule { }
