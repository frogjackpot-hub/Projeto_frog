import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { Router } from '@angular/router';

// Models
import { GameColor, GameResult, GameState, GameStatus } from './models';

// Constants
import { AVAILABLE_COLORS, GAME_CONFIG } from './constants';

// Services
import { FrogjackpotGameService } from './services';

// Sub-components
import {
  BetControlsComponent,
  ColorGridComponent,
  ColorSlotComponent,
  ResultDisplayComponent
} from './components';

@Component({
  selector: 'app-frogjackpot-game',
  standalone: true,
  imports: [
    CommonModule,
    ColorGridComponent,
    ColorSlotComponent,
    BetControlsComponent,
    ResultDisplayComponent
  ],
  templateUrl: './frogjackpot-game.html',
  styleUrl: './frogjackpot-game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrogjackpotGameComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gameService = inject(FrogjackpotGameService);

  // Expose constants to template
  readonly availableColors = AVAILABLE_COLORS;
  readonly maxSelections = GAME_CONFIG.MAX_SELECTIONS;

  // Computed state from service
  get gameState(): GameState {
    return this.gameService.gameState();
  }

  get status(): GameStatus {
    return this.gameService.status();
  }

  get selectedIndices(): number[] {
    return this.gameService.selectedIndices();
  }

  get playerChoices(): GameColor[] {
    return this.gameService.playerChoices();
  }

  get systemChoices(): (GameColor | null)[] {
    return this.gameService.systemChoices();
  }

  get currentBet(): number {
    return this.gameService.currentBet();
  }

  get balance(): number {
    return this.gameService.balance();
  }

  get result(): GameResult | null {
    return this.gameService.result();
  }

  get isPlaying(): boolean {
    return this.status === GameStatus.PLAYING || 
           this.status === GameStatus.REVEALING;
  }

  get isFinished(): boolean {
    return this.status === GameStatus.FINISHED;
  }

  get showResult(): boolean {
    return this.isFinished && this.result !== null;
  }

  get canPlay(): boolean {
    return this.selectedIndices.length === this.maxSelections && 
           this.currentBet <= this.balance &&
           !this.isPlaying;
  }

  get emptyPlayerSlots(): number[] {
    const emptyCount = this.maxSelections - this.playerChoices.length;
    return Array(Math.max(0, emptyCount)).fill(0);
  }

  get systemSlots(): (GameColor | null)[] {
    const slots = [...this.gameService.systemChoices()];
    // Garantir que sempre temos 6 slots
    while (slots.length < this.maxSelections) {
      slots.push(null);
    }
    return slots;
  }

  ngOnInit(): void {
    this.gameService.initialize();
  }

  ngOnDestroy(): void {
    this.gameService.cleanup();
  }

  // Event Handlers
  onBackClick(): void {
    this.router.navigate(['/games']);
  }

  onColorSelected(index: number): void {
    this.gameService.toggleColorSelection(index);
  }

  onBetChanged(value: number): void {
    this.gameService.setBet(value);
  }

  onPlayClicked(): void {
    this.gameService.playRound();
  }

  onResetClicked(): void {
    this.gameService.reset();
  }
}
