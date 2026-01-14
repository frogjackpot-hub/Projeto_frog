import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared-module';
import { FrogjackpotCardComponent } from './components/frogjackpot-card/frogjackpot-card.component';
import { GamesListComponent } from './components/games-list/games-list';
import { GamesRoutingModule } from './games-routing.module';

@NgModule({
  declarations: [
    GamesListComponent
  ],
  imports: [
    CommonModule,
    GamesRoutingModule,
    SharedModule,
    FrogjackpotCardComponent
  ]
})
export class GamesModule { }
